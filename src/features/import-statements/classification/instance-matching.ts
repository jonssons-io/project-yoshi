import Fuse from 'fuse.js'
import type { BillInstance, IncomeInstance } from '@/api/generated/types.gen'
import type { TransactionDraft } from '../types'
import { cleanBankDescription, normalizeMatchText } from './bank-description'

type MatchableIncomeInstance = Pick<
  IncomeInstance,
  | 'id'
  | 'incomeId'
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
    | 'bill'
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

/**
 * Whether the bank text names one of the given parties, e.g. vendor text
 * "TIBBER NORGE AS" for a bill called "Tibber".
 */
function descriptionNames(description: string, names: string[]): boolean {
  const key = cleanBankDescription(description).key
  if (!key) return false

  return names.some((name) => {
    const normalized = normalizeMatchText(name)
    if (normalized.length < 2) return false
    return (
      ` ${key} `.includes(` ${normalized} `) ||
      (key.length >= 3 && ` ${normalized} `.includes(` ${key} `))
    )
  })
}

/**
 * 0 when the row clearly belongs to the same party as the instance (same
 * recipient/sender already chosen, or its name is in the bank text); otherwise
 * a fuzzy score on the vendor part of the bank text.
 */
function partyScore(
  draft: TransactionDraft,
  sameParty: boolean,
  names: string[]
): number {
  if (sameParty || descriptionNames(draft.originalDescription, names)) return 0
  return textScore(
    cleanBankDescription(draft.originalDescription).merchant,
    names.join(' ')
  )
}

/** How far from a row's date an instance can be and still be a likely match. */
const LIKELY_DATE_WINDOW_DAYS = 45

export type RankedInstance<T> = {
  instance: T
  /** Close enough in date, and the same party or about the same amount. */
  likely: boolean
}

type RankableInstance = {
  /** Recurring bill/income the instance belongs to, when it has one. */
  seriesId: string | null
  date: string | Date
  amount: number
  sameParty: boolean
  names: string[]
}

/**
 * Orders instances by how well they fit a statement row. A recurring bill has
 * an instance for every coming month, so only the one closest in date to the
 * row counts as likely; the rest stay available further down the list.
 */
function rankInstances<
  T extends {
    id: string
  }
>(
  draft: TransactionDraft,
  instances: T[],
  describe: (instance: T) => RankableInstance
): RankedInstance<T>[] {
  const scored = instances.map((instance) => {
    const info = describe(instance)
    return {
      instance,
      seriesId: info.seriesId ?? instance.id,
      dateDays: dateDistanceDays(draft.date, info.date),
      amountRatio:
        draft.amount === 0 ? 0 : amountDistanceRatio(draft.amount, info.amount),
      partyMatches:
        info.sameParty ||
        descriptionNames(draft.originalDescription, info.names)
    }
  })

  const nearestBySeries = new Map<string, number>()
  for (const item of scored) {
    const nearest = nearestBySeries.get(item.seriesId)
    if (nearest === undefined || item.dateDays < nearest) {
      nearestBySeries.set(item.seriesId, item.dateDays)
    }
  }

  return scored
    .map((item) => ({
      ...item,
      likely:
        item.dateDays <= LIKELY_DATE_WINDOW_DAYS &&
        item.dateDays === nearestBySeries.get(item.seriesId) &&
        (item.partyMatches || item.amountRatio <= MAX_AMOUNT_DISTANCE_RATIO),
      score: item.dateDays / LIKELY_DATE_WINDOW_DAYS + item.amountRatio
    }))
    .sort(
      (a, b) =>
        Number(b.likely) - Number(a.likely) ||
        Number(b.partyMatches) - Number(a.partyMatches) ||
        a.score - b.score
    )
    .map(({ instance, likely }) => ({
      instance,
      likely
    }))
}

export function rankBillInstancesForDraft<T extends MatchableBillInstance>(
  draft: TransactionDraft,
  instances: T[]
): RankedInstance<T>[] {
  return rankInstances(draft, instances, (instance) => ({
    seriesId: instance.bill?.id ?? null,
    date: instance.dueDate,
    amount: instance.amount,
    sameParty:
      Boolean(draft.recipientId) && instance.recipient.id === draft.recipientId,
    names: [
      instance.name,
      instance.recipient.name ?? ''
    ]
  }))
}

export function rankIncomeInstancesForDraft<T extends MatchableIncomeInstance>(
  draft: TransactionDraft,
  instances: T[]
): RankedInstance<T>[] {
  return rankInstances(draft, instances, (instance) => ({
    seriesId: instance.incomeId ?? null,
    date: instance.expectedDate,
    amount: instance.amount,
    sameParty:
      Boolean(draft.incomeSourceId) &&
      instance.incomeSourceId === draft.incomeSourceId,
    names: [
      instance.name
    ]
  }))
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
    const nameScore = partyScore(
      draft,
      Boolean(draft.incomeSourceId) &&
        instance.incomeSourceId === draft.incomeSourceId,
      [
        instance.name
      ]
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
    const nameScore = partyScore(
      draft,
      Boolean(draft.recipientId) && instance.recipient.id === draft.recipientId,
      [
        instance.name,
        instance.recipient.name ?? ''
      ]
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
