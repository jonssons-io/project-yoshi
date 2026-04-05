/**
 * Map account id → display name for table rows and filters.
 */
export function accountsById<
  T extends {
    id: string
    name: string
  }
>(accounts: T[]): Map<string, string> {
  return new Map(
    accounts.map((a) => [
      a.id,
      a.name
    ])
  )
}
