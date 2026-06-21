export function parseSwedishMoney(value: string | number): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('statementImport.errors.invalidAmount')
    }
    return value
  }

  const normalized = value
    .trim()
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  if (!normalized) throw new Error('statementImport.errors.missingAmount')

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    throw new Error('statementImport.errors.invalidAmountWithValue')
  }
  return parsed
}

export function formatSwedishMoney(value: number): string {
  return new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
    .format(value)
    .replace(/\u00a0/g, ' ')
}
