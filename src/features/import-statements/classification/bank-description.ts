const PURCHASE_DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})\s+/
const CONTACTLESS_PREFIX = /^kontaktl[öo]s\s+/i

export type CleanedBankDescription = {
  /** Vendor part of the bank text, without purchase date, card marker, or city. */
  merchant: string
  /** Purchase date the bank puts in front of card purchases (`YYYY-MM-DD`). */
  purchaseDate: string | null
  /** Normalized `merchant`, used to recognize the same vendor across imports. */
  key: string
}

/**
 * Uppercases, strips diacritics, and turns punctuation into single spaces so
 * `Göteborg Energi` and `GOTEBORG ENERGI` compare equal.
 */
export function normalizeMatchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleUpperCase('sv-SE')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

/**
 * Card purchases arrive as `2026-11-18 kontaktlös ICA KVANTUM, GOTEBORG`.
 * Only the vendor part is stable between purchases, so the date, the
 * contactless marker, and the city are dropped before matching.
 */
export function cleanBankDescription(
  description: string
): CleanedBankDescription {
  let text = description.trim()
  let purchaseDate: string | null = null

  const dateMatch = text.match(PURCHASE_DATE_PREFIX)
  if (dateMatch) {
    purchaseDate = dateMatch[1]
    text = text.slice(dateMatch[0].length).replace(CONTACTLESS_PREFIX, '')
    const commaIndex = text.indexOf(',')
    if (commaIndex > 0) text = text.slice(0, commaIndex)
  }

  const merchant = text.replace(/\s+/g, ' ').trim()

  return {
    merchant,
    purchaseDate,
    key: normalizeMatchText(merchant)
  }
}
