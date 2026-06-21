import Fuse from 'fuse.js'
import type { BillInstance, IncomeInstance } from '@/api/generated/types.gen'
import type { TransactionDraft } from '../types'

type MatchableIncomeInstance = Pick<
  IncomeInstance,
  | 'id'
  | 'name'
  | 'amount'
  | 'expectedDate'
  | 'incomeSourceId'
  | 'categoryId'
  | 'transactionId'
>

type MatchableBillInstance = Omit<
  Pick<
    BillInstance,
    | 'id'
    | 'name'
    | 'recipient'
    | 'amount'
    | 'transaction'
    | 'budget'
    | 'category'
  >,
  'dueDate'
> & {
  dueDate: string | Date
}

const MAX_DATE_DISTANCE_DAYS = 7
const MAX_AMOUNT_DISTANCE_RATIO = 0.08

function dateDistanceDays(a: string, b: string | Date): number {
  const left = new Date(a)
  const right = b instanceof Date ? b : new Date(b)
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime()))
    return Infinity
  return Math.abs(left.getTime() - right.getTime()) / 86_400_000
}

function amountDistanceRatio(a: number, b: number): number {
  const base = Math.max(Math.abs(a), Math.abs(b), 1)
  return Math.abs(Math.abs(a) - Math.abs(b)) / base
}

function textScore(description: string, candidate: string): number {
  if (!description.trim() || !candidate.trim()) return 1
  const fuse = new Fuse(
    [
      {
        value: candidate
      }
    ],
    {
      keys: [
        'value'
      ],
      includeScore: true,
      ignoreDiacritics: true,
      ignoreLocation: true,
      threshold: 0.5
    }
  )
  return fuse.search(description)[0]?.score ?? 1
}

function instanceIsAvailable(
  instanceId: string,
  linkedTransactionId: string | null | undefined,
  selectedIds: Set<string>
): boolean {
  return !linkedTransactionId && !selectedIds.has(instanceId)
}

export function findMatchingIncomeInstanceId(
  draft: TransactionDraft,
  instances: MatchableIncomeInstance[],
  selectedIds: Set<string>
): string {
  let best: {
    id: string
    score: number
  } | null = null

  for (const instance of instances) {
    if (!instanceIsAvailable(instance.id, instance.transactionId, selectedIds))
      continue
    if (
      draft.incomeSourceId &&
      instance.incomeSourceId !== draft.incomeSourceId
    )
      continue

    const dateScore = dateDistanceDays(draft.date, instance.expectedDate)
    const amountScore =
      draft.amount === 0
        ? 0
        : amountDistanceRatio(draft.amount, instance.amount)
    const nameScore = textScore(draft.originalDescription, instance.name)
    if (
      dateScore > MAX_DATE_DISTANCE_DAYS ||
      amountScore > MAX_AMOUNT_DISTANCE_RATIO ||
      nameScore > 0.5
    ) {
      continue
    }

    const score = dateScore / MAX_DATE_DISTANCE_DAYS + amountScore + nameScore
    if (!best || score < best.score)
      best = {
        id: instance.id,
        score
      }
  }

  return best?.id ?? ''
}

function formatInstanceDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export function getIncomeInstanceLabel(
  instance: MatchableIncomeInstance
): string {
  return `${formatInstanceDate(instance.expectedDate)} | ${instance.name}`
}

export function getBillInstanceLabel(instance: MatchableBillInstance): string {
  return `${formatInstanceDate(instance.dueDate)} | ${instance.name}`
}

export function buildIncomeInstancePatch(
  instance: MatchableIncomeInstance
): Partial<TransactionDraft> {
  return {
    incomeInstanceId: instance.id,
    name: instance.name,
    date: formatInstanceDate(instance.expectedDate),
    incomeSourceId: instance.incomeSourceId,
    newIncomeSourceName: null,
    categoryId: instance.categoryId ?? null,
    newCategoryName: null
  }
}

export function buildBillInstancePatch(
  instance: MatchableBillInstance
): Partial<TransactionDraft> {
  return {
    billInstanceId: instance.id,
    name: instance.name,
    date: formatInstanceDate(instance.dueDate),
    recipientId: instance.recipient.id,
    newRecipientName: null,
    budgetId: instance.budget?.id ?? null,
    categoryId: instance.category?.id ?? null,
    newCategoryName: null
  }
}

export function findMatchingBillInstanceId(
  draft: TransactionDraft,
  instances: MatchableBillInstance[],
  selectedIds: Set<string>
): string {
  let best: {
    id: string
    score: number
  } | null = null

  for (const instance of instances) {
    if (
      !instanceIsAvailable(instance.id, instance.transaction?.id, selectedIds)
    )
      continue
    if (draft.recipientId && instance.recipient.id !== draft.recipientId)
      continue

    const dateScore = dateDistanceDays(draft.date, instance.dueDate)
    const amountScore =
      draft.amount === 0
        ? 0
        : amountDistanceRatio(draft.amount, instance.amount)
    const nameScore = textScore(
      draft.originalDescription,
      `${instance.name} ${instance.recipient.name}`
    )
    if (
      dateScore > MAX_DATE_DISTANCE_DAYS ||
      amountScore > MAX_AMOUNT_DISTANCE_RATIO ||
      nameScore > 0.5
    ) {
      continue
    }

    const score = dateScore / MAX_DATE_DISTANCE_DAYS + amountScore + nameScore
    if (!best || score < best.score)
      best = {
        id: instance.id,
        score
      }
  }

  return best?.id ?? ''
}
