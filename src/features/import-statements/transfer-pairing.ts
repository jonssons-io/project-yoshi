import { TransactionType } from '@/api/generated/types.gen'
import { cleanBankDescription } from './classification/bank-description'
import type { TransactionDraft } from './types'

const MS_PER_DAY = 86_400_000
/** Transfers between banks can be booked a few days apart on the two sides. */
const MAX_BOOKING_GAP_DAYS = 3

function toCents(amount: number): number {
  return Math.round(Math.abs(amount) * 100)
}

function dayOf(date: string): number {
  return Math.round(new Date(`${date}T00:00:00.000Z`).getTime() / MS_PER_DAY)
}

function isPairable(draft: TransactionDraft): boolean {
  return (
    draft.statementIndex !== undefined &&
    !draft.excluded &&
    !draft.pairedWithDraftId &&
    draft.signedAmount !== 0
  )
}

function isTransfer(draft: TransactionDraft): boolean {
  return draft.type === TransactionType.TRANSFER
}

/**
 * A row not labelled as a transfer may still be one side of a transfer, unless
 * it is a card purchase or a vendor/sender the import already recognizes.
 */
function mayBeUnlabelledTransfer(draft: TransactionDraft): boolean {
  return (
    !cleanBankDescription(draft.originalDescription).purchaseDate &&
    !draft.recipientId &&
    !draft.incomeSourceId
  )
}

function couldBeSameTransfer(
  outgoing: TransactionDraft,
  incoming: TransactionDraft
): boolean {
  if (outgoing.statementIndex === incoming.statementIndex) return false
  // Two files for the same account cannot be the two sides of one transfer.
  if (
    outgoing.originAccountId &&
    outgoing.originAccountId === incoming.originAccountId
  ) {
    return false
  }
  return toCents(outgoing.signedAmount) === toCents(incoming.signedAmount)
}

/**
 * Finds money that left one uploaded statement and arrived in another: the
 * same amount, out of one account and into a different one. The pair becomes a
 * single transfer between the two accounts — the outgoing row is imported with
 * the other account filled in, and the incoming row is excluded so the
 * transfer is not saved twice.
 *
 * Pairing is deliberately careful:
 * - same day, both rows look like transfers;
 * - same day, one row looks like a transfer and the other is neither a card
 *   purchase nor a recognized vendor/sender (it is reclassified as a transfer);
 * - up to three days apart, both rows look like transfers.
 * An expense and an income that merely share an amount are left alone.
 */
export function pairTransfersAcrossStatements(
  drafts: TransactionDraft[]
): TransactionDraft[] {
  const next = [
    ...drafts
  ]

  const passes: Array<{
    maxGapDays: number
    accepts: (outgoing: TransactionDraft, incoming: TransactionDraft) => boolean
  }> = [
    {
      maxGapDays: 0,
      accepts: (outgoing, incoming) =>
        isTransfer(outgoing) && isTransfer(incoming)
    },
    {
      maxGapDays: 0,
      accepts: (outgoing, incoming) =>
        (isTransfer(outgoing) && mayBeUnlabelledTransfer(incoming)) ||
        (isTransfer(incoming) && mayBeUnlabelledTransfer(outgoing))
    },
    {
      maxGapDays: MAX_BOOKING_GAP_DAYS,
      accepts: (outgoing, incoming) =>
        isTransfer(outgoing) && isTransfer(incoming)
    }
  ]

  for (const pass of passes) {
    for (let outIndex = 0; outIndex < next.length; outIndex++) {
      const outgoing = next[outIndex]
      if (!isPairable(outgoing) || outgoing.signedAmount > 0) continue

      let bestIndex = -1
      let bestGap = Number.POSITIVE_INFINITY
      for (let inIndex = 0; inIndex < next.length; inIndex++) {
        const incoming = next[inIndex]
        if (!isPairable(incoming) || incoming.signedAmount < 0) continue
        if (!couldBeSameTransfer(outgoing, incoming)) continue
        if (!pass.accepts(outgoing, incoming)) continue

        const gap = Math.abs(dayOf(outgoing.date) - dayOf(incoming.date))
        if (gap > pass.maxGapDays || gap >= bestGap) continue
        bestIndex = inIndex
        bestGap = gap
      }
      if (bestIndex < 0) continue

      const incoming = next[bestIndex]
      next[outIndex] = {
        ...outgoing,
        type: TransactionType.TRANSFER,
        transferFromAccountId: outgoing.originAccountId,
        transferToAccountId: incoming.originAccountId,
        pairedWithDraftId: incoming.id
      }
      next[bestIndex] = {
        ...incoming,
        type: TransactionType.TRANSFER,
        transferFromAccountId: outgoing.originAccountId,
        transferToAccountId: incoming.originAccountId,
        excluded: true,
        pairedWithDraftId: outgoing.id
      }
    }
  }

  return next
}
