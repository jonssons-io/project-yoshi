import type { TFunction } from 'i18next'

import type { RecurrenceType } from '@/api/generated/types.gen'
import { formatCurrency } from '@/lib/utils'

export type RevisionLabelLookups = {
  accountById: Map<string, string>
  categoryById: Map<string, string>
  incomeSourceById?: Map<string, string>
  recipientById?: Map<string, string>
  budgetById?: Map<string, string>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function relationName(value: unknown): string | null {
  if (!isRecord(value)) return null
  const name = value.name
  if (typeof name === 'string' && name.length > 0) return name
  const id = value.id
  if (typeof id === 'string' && id.length > 0) return id
  return null
}

function formatRecurrence(value: unknown, t: TFunction): string | null {
  if (typeof value !== 'string') return null
  const map: Record<string, string> = {
    NONE: 'recurrence.none',
    WEEKLY: 'recurrence.weekly',
    MONTHLY: 'recurrence.monthly',
    QUARTERLY: 'recurrence.quarterly',
    YEARLY: 'recurrence.yearly',
    CUSTOM: 'recurrence.custom'
  }
  const key = map[value as RecurrenceType]
  return key ? t(key) : value
}

function formatPaymentHandling(value: unknown, t: TFunction): string | null {
  if (typeof value !== 'string') return null
  const key = `bills.paymentHandling.${value}` as const
  const label = t(key)
  return label === key ? value : label
}

function formatIsoDate(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 10) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value.slice(0, 10)
  return d.toLocaleDateString('sv-SE')
}

/**
 * Renders API revision values for display (amounts, enums, ids resolved via lookups, JSON fallbacks).
 */
export function formatBlueprintRevisionValue(
  field: string,
  value: unknown,
  t: TFunction,
  lookups: RevisionLabelLookups
): string {
  if (value === null || value === undefined) {
    return t('drawers.blueprintRevisions.value.empty')
  }

  switch (field) {
    case 'estimatedAmount':
      if (typeof value === 'number') return formatCurrency(value)
      break
    case 'recurrenceType': {
      const r = formatRecurrence(value, t)
      if (r) return r
      break
    }
    case 'paymentHandling':
      if (typeof value === 'string') {
        const p = formatPaymentHandling(value, t)
        if (p) return p
      }
      break
    case 'customIntervalDays':
      if (typeof value === 'number') return String(value)
      break
    case 'accountId':
      if (typeof value === 'string')
        return lookups.accountById.get(value) ?? value
      break
    case 'categoryId':
      if (typeof value === 'string')
        return lookups.categoryById.get(value) ?? value
      break
    case 'incomeSourceId':
      if (typeof value === 'string' && lookups.incomeSourceById) {
        return lookups.incomeSourceById.get(value) ?? value
      }
      break
    case 'recipientId':
      if (typeof value === 'string' && lookups.recipientById) {
        return lookups.recipientById.get(value) ?? value
      }
      break
    case 'budgetId':
      if (typeof value === 'string' && lookups.budgetById) {
        return lookups.budgetById.get(value) ?? value
      }
      break
    case 'expectedDate':
    case 'dueDate':
    case 'endDate':
    case 'lastPaymentDate': {
      const dt = formatIsoDate(value)
      if (dt) return dt
      break
    }
    case 'name':
      if (typeof value === 'string') return value
      break
    default:
      break
  }

  const rel = relationName(value)
  if (rel) return rel

  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean')
    return value ? t('common.yes') : t('common.no')

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
