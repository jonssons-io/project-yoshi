import { TransactionType } from '@/api/generated/types.gen'

const TRANSFER_PATTERN = /överföring|överf\.|overforing|overf\./i

export function classifyTransaction(
  description: string,
  amount: number
): TransactionType {
  if (TRANSFER_PATTERN.test(description)) return TransactionType.TRANSFER
  if (amount < 0) return TransactionType.EXPENSE
  return TransactionType.INCOME
}
