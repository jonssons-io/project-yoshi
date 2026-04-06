import { z } from 'zod'

import { RecurrenceType } from '@/api/generated/types.gen'
import { nullablePositiveNumber } from '@/lib/zod-nullable-number'

/** Base object schema — keep `.shape` for per-field validators (superRefine wraps the object). */
export const incomeObjectSchema = z.object({
  name: z.string().min(1, 'validation.nameRequired'),
  incomeSource: z
    .union([
      z.string().min(1, 'validation.sourceRequired'),
      z.object({
        isNew: z.literal(true),
        name: z.string().min(1, 'validation.sourceRequired')
      }),
      z.null()
    ])
    .refine((v): v is Exclude<typeof v, null> => v !== null, {
      message: 'validation.sourceRequired'
    }),
  amount: nullablePositiveNumber('validation.positive'),
  expectedDate: z.date({
    message: 'validation.dateRequired'
  }),
  accountId: z.string().min(1, 'validation.accountRequired'),
  category: z.union([
    z.string().min(1, {
      message: 'validation.categoryRequired'
    }),
    z.object({
      isNew: z.literal(true),
      name: z.string().min(1, {
        message: 'validation.categoryNameRequired'
      })
    })
  ]),
  recurrenceType: z.nativeEnum(RecurrenceType),
  customIntervalDays: z.number().optional().nullable(),
  endDate: z.date().optional().nullable()
})

/** Full schema for submit / parsing (all fields required except end date; custom interval when recurrence is CUSTOM). */
export const incomeSchema = incomeObjectSchema.superRefine((data, ctx) => {
  if (data.amount == null) {
    ctx.addIssue({
      code: 'custom',
      message: 'validation.positive',
      path: [
        'amount'
      ]
    })
  }
  if (data.recurrenceType !== RecurrenceType.CUSTOM) return
  const n = data.customIntervalDays
  if (n == null || n < 1) {
    ctx.addIssue({
      code: 'custom',
      message: 'validation.customIntervalRequired',
      path: [
        'customIntervalDays'
      ]
    })
  }
})

export type CreateIncomeFormValues = z.infer<typeof incomeSchema>
