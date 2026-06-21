import Fuse from 'fuse.js'
import { TransactionType } from '@/api/generated/types.gen'
import type { ImportLookupItem, TransactionDraft } from '../types'

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
    pattern: /ica/i,
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

  if (next.type === TransactionType.EXPENSE && !next.recipientId) {
    const fuzzyRecipientId = findFuzzyRecipientId(
      draft.originalDescription,
      lookups.recipients
    )
    if (fuzzyRecipientId) {
      next = {
        ...next,
        recipientId: fuzzyRecipientId
      }
    }
  }

  return next
}
