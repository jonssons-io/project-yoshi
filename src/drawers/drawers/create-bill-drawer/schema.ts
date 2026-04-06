import { z } from 'zod'

import { BillPaymentHandling, RecurrenceType } from '@/api/generated/types.gen'
import {
  nullableNumber,
  nullablePositiveNumber
} from '@/lib/zod-nullable-number'

export const billSplitRowSchema = z.object({
  id: z.string(),
  subtitle: z.string(),
  amount: nullablePositiveNumber('validation.positive'),
  category: z.union([
    z.string().min(1),
    z.object({
      isNew: z.literal(true),
      name: z.string().min(1)
    })
  ])
})

export const createBillDrawerSchema = z
  .object({
    name: z.string().min(1, 'validation.nameRequired'),
    recipient: z
      .union([
        z.string(),
        z.object({
          isNew: z.literal(true),
          name: z.string()
        }),
        z.null()
      ])
      .optional(),
    accountId: z.string().min(1, 'validation.accountRequired'),
    recurrenceType: z.enum(RecurrenceType),
    customIntervalDays: z
      .union([
        z.null(),
        z.number().int().positive()
      ])
      .optional(),
    paymentHandling: z.enum(BillPaymentHandling).optional().or(z.literal('')),
    dueDate: z.date({
      message: 'validation.dateRequired'
    }),
    endDate: z.date().nullable().optional(),
    amount: nullableNumber(),
    budgetId: z.string().optional(),
    category: z
      .union([
        z.string().min(1),
        z.object({
          isNew: z.literal(true),
          name: z.string().min(1)
        }),
        z.null()
      ])
      .optional(),
    splits: z.array(billSplitRowSchema).optional()
  })
  .superRefine((data, ctx) => {
    const r = data.recipient
    const hasRecipient =
      typeof r === 'string'
        ? r.length > 0
        : typeof r === 'object' &&
          r !== null &&
          'isNew' in r &&
          r.isNew &&
          r.name.trim().length > 0

    if (!hasRecipient) {
      ctx.addIssue({
        code: 'custom',
        message: 'validation.recipientRequired',
        path: [
          'recipient'
        ]
      })
    }

    if (data.recurrenceType === RecurrenceType.CUSTOM) {
      if (
        data.customIntervalDays === undefined ||
        data.customIntervalDays === null ||
        data.customIntervalDays < 1
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'validation.positive',
          path: [
            'customIntervalDays'
          ]
        })
      }
    }

    const hasSplits = (data.splits?.length ?? 0) > 0

    if (!hasSplits) {
      if (data.amount == null || data.amount <= 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'validation.positive',
          path: [
            'amount'
          ]
        })
      }
      if (!data.budgetId) {
        ctx.addIssue({
          code: 'custom',
          message: 'validation.required',
          path: [
            'budgetId'
          ]
        })
      }
      const c = data.category
      const hasCategory =
        typeof c === 'string'
          ? c.length > 0
          : typeof c === 'object' &&
            c !== null &&
            'isNew' in c &&
            c.isNew &&
            c.name.trim().length > 0
      if (!hasCategory) {
        ctx.addIssue({
          code: 'custom',
          message: 'validation.categoryRequired',
          path: [
            'category'
          ]
        })
      }
      return
    }

    data.splits?.forEach((row, i) => {
      const parsed = billSplitRowSchema.safeParse(row)
      if (!parsed.success) {
        for (const iss of parsed.error.issues) {
          ctx.addIssue({
            ...iss,
            path: [
              'splits',
              i,
              ...(iss.path as (string | number)[])
            ]
          })
        }
      }
      if (row.amount == null) {
        ctx.addIssue({
          code: 'custom',
          message: 'validation.positive',
          path: [
            'splits',
            i,
            'amount'
          ]
        })
      }
    })
  })

export type ParsedCreateBillDrawerValues = z.infer<
  typeof createBillDrawerSchema
>
