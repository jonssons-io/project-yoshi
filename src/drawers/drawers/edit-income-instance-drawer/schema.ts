import { z } from 'zod'

import { nullablePositiveNumber } from '@/lib/zod-nullable-number'

const incomeSourceFieldSchema = z.union([
  z.string().min(1, 'validation.sourceRequired'),
  z.object({
    isNew: z.literal(true),
    name: z.string().min(1, 'validation.sourceRequired')
  })
])

/** Aligned with `UpdateIncomeInstanceRequest` after OpenAPI extension. */
export const editIncomeInstanceObjectSchema = z.object({
  name: z.string().min(1, 'validation.nameRequired'),
  incomeSource: incomeSourceFieldSchema,
  accountId: z.string().min(1, 'validation.accountRequired'),
  amount: nullablePositiveNumber('validation.positive'),
  expectedDate: z.date({
    message: 'validation.dateRequired'
  }),
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

export const editIncomeInstanceSchema =
  editIncomeInstanceObjectSchema.superRefine((data, ctx) => {
    if (data.amount == null) {
      ctx.addIssue({
        code: 'custom',
        message: 'validation.positive',
        path: [
          'amount'
        ]
      })
    }
  })

export type EditIncomeInstanceFormValues = z.infer<
  typeof editIncomeInstanceSchema
>
