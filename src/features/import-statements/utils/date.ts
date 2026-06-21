const EXCEL_EPOCH_OFFSET = 25_569
const MS_PER_DAY = 86_400_000

function formatDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error('statementImport.errors.invalidDate')
  }
  return date.toISOString().slice(0, 10)
}

function fromParts(year: number, month: number, day: number): string {
  return formatDate(new Date(Date.UTC(year, month - 1, day)))
}

export function parseStatementDate(value: string | number | Date): string {
  if (value instanceof Date) return formatDate(value)

  if (typeof value === 'number') {
    return formatDate(new Date((value - EXCEL_EPOCH_OFFSET) * MS_PER_DAY))
  }

  const text = value.trim()
  if (!text) throw new Error('statementImport.errors.missingDate')

  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (iso) return fromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const swedish = text.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/)
  if (swedish) {
    return fromParts(Number(swedish[3]), Number(swedish[2]), Number(swedish[1]))
  }

  throw new Error('statementImport.errors.invalidDateWithValue')
}
