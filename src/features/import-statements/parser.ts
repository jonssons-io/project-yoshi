import * as XLSX from 'xlsx'
import { TransactionType } from '@/api/generated/types.gen'
import { classifyTransaction } from './classification/classify-transaction'
import type {
  InvalidStatementRow,
  StatementParseResult,
  TransactionDraft
} from './types'
import { parseStatementDate } from './utils/date'
import { parseSwedishMoney } from './utils/money'

const SUPPORTED_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
  ''
])

type HeaderKey = 'date' | 'description' | 'amount' | 'balance'

const HEADER_ALIASES: Record<HeaderKey, string[]> = {
  date: [
    'bokfdatum',
    'bokforingsdatum',
    'datum'
  ],
  description: [
    'beskrivning',
    'text',
    'transaktion'
  ],
  amount: [
    'belopp',
    'amount'
  ],
  balance: [
    'saldo',
    'balance'
  ]
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .toLocaleLowerCase('sv-SE')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '')
}

function isEmptyRow(row: unknown[]): boolean {
  return row.every((cell) => String(cell ?? '').trim() === '')
}

function findHeaderIndex(row: unknown[], key: HeaderKey): number {
  const normalizedAliases = HEADER_ALIASES[key].map(normalizeHeader)
  return row.findIndex((cell) =>
    normalizedAliases.includes(normalizeHeader(cell))
  )
}

function findHeaderRow(rows: unknown[][]): {
  index: number
  columns: Record<Exclude<HeaderKey, 'balance'>, number>
} {
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    const date = findHeaderIndex(row, 'date')
    const description = findHeaderIndex(row, 'description')
    const amount = findHeaderIndex(row, 'amount')
    if (date >= 0 && description >= 0 && amount >= 0) {
      return {
        index,
        columns: {
          date,
          description,
          amount
        }
      }
    }
  }

  throw new Error('statementImport.errors.noTransactionHeader')
}

function parseAccountNumber(rows: unknown[][]): string | null {
  for (const row of rows.slice(0, 10)) {
    const labelIndex = row.findIndex(
      (cell) => normalizeHeader(cell) === 'kontonummer'
    )
    if (labelIndex < 0) continue

    const value = row
      .slice(labelIndex + 1)
      .find((cell) => String(cell ?? '').trim() !== '')
    return value == null ? null : String(value).trim()
  }

  return null
}

function makeDraft(args: {
  sourceRowNumber: number
  description: string
  date: string
  amount: number
}): TransactionDraft {
  const type = classifyTransaction(args.description, args.amount)
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${args.sourceRowNumber}-${Date.now()}`,
    sourceRowNumber: args.sourceRowNumber,
    originalDescription: args.description,
    date: args.date,
    amount: Math.abs(args.amount),
    type,
    name: args.description,
    originAccountId: '',
    excluded: false,
    parseWarnings:
      type === TransactionType.TRANSFER
        ? [
            'statementImport.warnings.reviewTransferDestination'
          ]
        : undefined
  }
}

export function isSupportedStatementFile(file: File): boolean {
  return (
    file.name.toLocaleLowerCase('sv-SE').endsWith('.xlsx') &&
    SUPPORTED_MIME_TYPES.has(file.type)
  )
}

export async function parseStatementFile(
  file: File
): Promise<StatementParseResult> {
  if (!isSupportedStatementFile(file)) {
    throw new Error('statementImport.errors.onlyXlsxSupported')
  }

  return parseXlsxStatement(file)
}

export async function parseXlsxStatement(
  file: File
): Promise<StatementParseResult> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true
  })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('statementImport.errors.noWorksheets')

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    blankrows: false
  })

  const accountNumber = parseAccountNumber(rows)
  const header = findHeaderRow(rows)
  const transactions: TransactionDraft[] = []
  const invalidRows: InvalidStatementRow[] = []

  for (let index = header.index + 1; index < rows.length; index++) {
    const row = rows[index]
    const sourceRowNumber = index + 1
    if (isEmptyRow(row)) {
      invalidRows.push({
        sourceRowNumber,
        rawValues: row,
        reason: 'statementImport.errors.emptyRow'
      })
      continue
    }

    try {
      const description = String(row[header.columns.description] ?? '').trim()
      if (!description)
        throw new Error('statementImport.errors.missingDescription')

      const date = parseStatementDate(
        row[header.columns.date] as string | number | Date
      )
      const amount = parseSwedishMoney(
        row[header.columns.amount] as string | number
      )

      transactions.push(
        makeDraft({
          sourceRowNumber,
          description,
          date,
          amount
        })
      )
    } catch (error) {
      invalidRows.push({
        sourceRowNumber,
        rawValues: row,
        reason:
          error instanceof Error
            ? error.message
            : 'statementImport.errors.malformedRow'
      })
    }
  }

  if (transactions.length === 0) {
    throw new Error('statementImport.errors.noTransactionsFound')
  }

  return {
    accountNumber,
    transactions,
    invalidRows
  }
}

export { normalizeHeader }
