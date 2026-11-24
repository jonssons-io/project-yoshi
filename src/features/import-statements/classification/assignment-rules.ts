import Fuse from 'fuse.js'
import { TransactionType } from '@/api/generated/types.gen'
import type { ImportLookupItem, TransactionDraft } from '../types'
import { cleanBankDescription, normalizeMatchText } from './bank-description'
import {
  applyHistoryByKey,
  applyHistoryDefaults,
  type ImportHistoryIndex
} from './history-matching'

type AssignmentRule = {
  pattern: RegExp
  recipientName?: string
  incomeSourceName?: string
  categoryName?: string
  type?: TransactionDraft['type']
}

const ASSIGNMENT_RULES: AssignmentRule[] = [
  {
    pattern: /göteborg energi/i,
    recipientName: 'Göteborg Energi',
    categoryName: 'Utilities'
  },
  {
    pattern: /tibber/i,
    recipientName: 'Tibber',
    categoryName: 'Electricity'
  },
  {
    // Whole word only, so "Pharmacia" or "Mexicana" is not taken for ICA.
    pattern: /\bica\b/i,
    recipientName: 'ICA',
    categoryName: 'Groceries'
  },
  {
    pattern: /bahnhof/i,
    recipientName: 'Bahnhof',
    categoryName: 'Internet'
  },
  {
    pattern: /csn/i,
    recipientName: 'CSN',
    categoryName: 'Loan'
  },
  {
    pattern: /lön/i,
    categoryName: 'Salary'
  },
  {
    pattern: /överföring|överf\./i,
    type: TransactionType.TRANSFER
  }
]

function findByName(
  name: string | undefined,
  items: ImportLookupItem[]
): string {
  if (!name) return ''
  const normalized = name.toLocaleLowerCase('sv-SE')
  return (
    items.find((item) => item.name.toLocaleLowerCase('sv-SE') === normalized)
      ?.id ?? ''
  )
}

/**
 * Finds the recipient whose whole name appears in the vendor text, e.g.
 * recipient "Coop" in "STORA COOP CENTRUM". The longest name wins so
 * "Arken Zoo" beats a shorter "Zoo".
 */
export function findRecipientIdInDescription(
  description: string,
  recipients: ImportLookupItem[]
): string {
  const haystack = ` ${cleanBankDescription(description).key} `
  let best: {
    id: string
    length: number
  } | null = null

  for (const recipient of recipients) {
    if (recipient.archived) continue
    const needle = normalizeMatchText(recipient.name)
    if (needle.length < 2 || !haystack.includes(` ${needle} `)) continue
    if (!best || needle.length > best.length) {
      best = {
        id: recipient.id,
        length: needle.length
      }
    }
  }

  return best?.id ?? ''
}

export function findFuzzyRecipientId(
  description: string,
  recipients: ImportLookupItem[]
): string {
  if (!description.trim() || recipients.length === 0) return ''

  const fuse = new Fuse(recipients, {
    keys: [
      'name'
    ],
    includeScore: true,
    ignoreDiacritics: true,
    ignoreLocation: true,
    threshold: 0.3
  })
  const [match] = fuse.search(description)

  return match && (match.score ?? 1) <= 0.3 ? match.item.id : ''
}

export function applyAssignmentRules(
  draft: TransactionDraft,
  lookups: {
    recipients: ImportLookupItem[]
    incomeSources: ImportLookupItem[]
    categories: ImportLookupItem[]
    budgets?: ImportLookupItem[]
    /** Earlier transactions; the user's own latest choice beats the rules. */
    history?: ImportHistoryIndex
  }
): TransactionDraft {
  let next = draft

  for (const rule of ASSIGNMENT_RULES) {
    if (!rule.pattern.test(draft.originalDescription)) continue

    const recipientId = findByName(rule.recipientName, lookups.recipients)
    const incomeSourceId = findByName(
      rule.incomeSourceName,
      lookups.incomeSources
    )
    const categoryId = findByName(rule.categoryName, lookups.categories)

    next = {
      ...next,
      type: rule.type ?? next.type,
      recipientId: recipientId || next.recipientId,
      incomeSourceId: incomeSourceId || next.incomeSourceId,
      categoryId: categoryId || next.categoryId
    }
  }

  if (lookups.history) {
    next = applyHistoryByKey(next, lookups.history, lookups)
  }

  if (next.type === TransactionType.EXPENSE && !next.recipientId) {
    const recipientId =
      findRecipientIdInDescription(
        draft.originalDescription,
        lookups.recipients
      ) ||
      // Fuzzy search needs the short vendor text; the purchase date and city
      // around it would otherwise drown out the recipient name.
      findFuzzyRecipientId(
        cleanBankDescription(draft.originalDescription).merchant,
        lookups.recipients
      )
    if (recipientId) {
      next = {
        ...next,
        recipientId
      }
    }
  }

  if (lookups.history) {
    next = applyHistoryDefaults(next, lookups.history, lookups)
  }

  return next
}
