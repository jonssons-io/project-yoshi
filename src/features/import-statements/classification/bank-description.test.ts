import { describe, expect, it } from 'vitest'
import { cleanBankDescription, normalizeMatchText } from './bank-description'

describe('cleanBankDescription', () => {
  it('strips purchase date, contactless marker, and city from card purchases', () => {
    expect(
      cleanBankDescription(
        '2026-11-18 kontaktlös ICA KVANTUM STORTORGET, GOTEBORG'
      )
    ).toEqual({
      merchant: 'ICA KVANTUM STORTORGET',
      purchaseDate: '2026-11-18',
      key: 'ICA KVANTUM STORTORGET'
    })
  })

  it('gives the same key with and without the contactless marker', () => {
    expect(
      cleanBankDescription('2026-11-09 kontaktlös LUNCHBAREN, GOTEBORG').key
    ).toBe(cleanBankDescription('2026-11-21 LUNCHBAREN, GOTEBORG').key)
  })

  it('drops everything after the first comma of a card purchase', () => {
    expect(
      cleanBankDescription(
        '2026-11-06 kontaktlös CUBUS C48, V STRA STADEN, V STRA STADE'
      ).merchant
    ).toBe('CUBUS C48')
  })

  it('keeps text without a purchase date whole', () => {
    expect(cleanBankDescription('Överf. A. Andersson')).toEqual({
      merchant: 'Överf. A. Andersson',
      purchaseDate: null,
      key: 'OVERF A ANDERSSON'
    })
  })
})

describe('normalizeMatchText', () => {
  it('ignores case, diacritics, and punctuation', () => {
    expect(normalizeMatchText('Göteborg Energi')).toBe('GOTEBORG ENERGI')
    expect(normalizeMatchText('X:-TRA  Centrum')).toBe('X TRA CENTRUM')
  })
})
