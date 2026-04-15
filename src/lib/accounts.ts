/**
 * Account display helpers for selectors, tables, and filters.
 */

export type AccountLabelFields = {
  name: string
  externalIdentifier?: string | null
}

/**
 * Single visible label for account dropdowns: name, or "Name (external id)" when an external id exists.
 */
export function formatAccountLabel(account: AccountLabelFields): string {
  const rawName = account.name?.trim() ?? ''
  const ext = account.externalIdentifier?.trim()
  if (!ext) return rawName
  if (!rawName) return ext
  return `${rawName} (${ext})`
}

/**
 * Map account id → label for selectors, filter drawers, and filter pills (includes external id when present).
 * For table cells, use nested `account.name` on the API row when present, or
 * `accounts.find((a) => a.id === accountId)?.name` from the household accounts list.
 */
export function accountsById<
  T extends {
    id: string
    name: string
    externalIdentifier?: string | null
  }
>(accounts: T[]): Map<string, string> {
  return new Map(
    accounts.map((a) => [
      a.id,
      formatAccountLabel(a)
    ])
  )
}
