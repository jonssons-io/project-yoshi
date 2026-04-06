import { z } from 'zod'

import { RecurrenceType } from '@/api/generated/types.gen'
import { nullablePositiveNumber } from '@/lib/zod-nullable-number'

const incomeSourceFieldSchema = z.union([
  z.string().min(1, 'validation.sourceRequired'),
  z.object({
    isNew: z.literal(true),
    name: z.string().min(1, 'validation.sourceRequired')
  })
])

export const editIncomeBlueprintObjectSchema = z.object({
  name: z.string().min(1, 'validation.nameRequired'),
  incomeSource: incomeSourceFieldSchema,
  accountId: z.string().min(1, 'validation.accountRequired'),
  amount: nullablePositiveNumber('validation.positive'),
  recurrenceType: z.enum(RecurrenceType),
  customIntervalDays: z.number().optional().nullable(),
  changeDate: z.date().optional().nullable(),
  expectedDate: z.date({
    message: 'validation.dateRequired'
  }),
  endDate: z.date().optional().nullable(),
  category: z
    .union([
      z.string().min(1, {
        message: 'validation.categoryRequired'
      }),
      z.object({
        isNew: z.literal(true),
        name: z.string().min(1, {
          message: 'validation.categoryNameRequired'
        })
      }),
      z.null()
    ])
    .optional()
})

export const editIncomeBlueprintSchema =
  editIncomeBlueprintObjectSchema.superRefine((data, ctx) => {
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

export type EditIncomeBlueprintFormValues = z.infer<
  typeof editIncomeBlueprintSchema
>
