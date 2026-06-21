import type { ImportLookupItem } from './types'

export function normalizeAccountNumber(
  value: string | null | undefined
): string {
  return (value ?? '').replace(/[\s.-]/g, '')
}

function accountCandidates(account: ImportLookupItem): string[] {
  return [
    account.externalIdentifier,
    account.name,
    account.id
  ]
    .map(normalizeAccountNumber)
    .filter(Boolean)
}

export function findMatchingAccountId(
  accountNumber: string | null,
  accounts: ImportLookupItem[]
): string {
  const normalized = normalizeAccountNumber(accountNumber)
  if (!normalized) return ''

  const matches = accounts.filter((account) =>
    accountCandidates(account).some((candidate) =>
      normalized.includes(candidate)
    )
  )

  return matches.length === 1 ? matches[0].id : ''
}

export function guessTransferAccountId(
  description: string,
  accounts: ImportLookupItem[],
  originAccountId: string
): string {
  const digitGroups = description.match(/\d[\d\s.-]{1,}\d/g) ?? []
  const candidates = digitGroups
    .map(normalizeAccountNumber)
    .filter((candidate) => candidate.length >= 2)
    .sort((a: string, b: string) => b.length - a.length)

  for (const candidate of candidates) {
    const matched = findMatchingAccountId(
      candidate,
      accounts.filter((account) => account.id !== originAccountId)
    )
    if (matched) return matched
  }

  return ''
}
