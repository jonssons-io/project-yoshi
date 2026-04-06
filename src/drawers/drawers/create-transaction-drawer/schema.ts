import { z } from 'zod'

import { TransactionType } from '@/api/generated/types.gen'
import { nullablePositiveNumber } from '@/lib/zod-nullable-number'

export const splitRowSchema = z.object({
  id: z.string(),
  subtitle: z.string(),
  amount: nullablePositiveNumber('validation.positive'),
  budgetId: z.string().min(1, 'validation.required'),
  category: z.union([
    z.string().min(1),
    z.object({
      isNew: z.literal(true),
      name: z.string().min(1)
    })
  ])
})

export const drawerFormSchema = z
  .object({
    /** Transfer uses API default label; the name field is not shown for TRANSFER. */
    name: z.string(),
    date: z.date({
      message: 'validation.dateRequired'
    }),
    amount: nullablePositiveNumber('validation.positive'),
    transactionType: z.enum(TransactionType),
    accountId: z.string().min(1, 'validation.accountRequired'),
    transferToAccountId: z.string().optional(),
    recipient: z
      .union([
        z.string().min(1),
        z.object({
          isNew: z.literal(true),
          name: z.string().min(1)
        }),
        z.null()
      ])
      .optional(),
    sender: z
      .union([
        z.string().min(1),
        z.object({
          isNew: z.literal(true),
          name: z.string().min(1)
        }),
        z.null()
      ])
      .optional(),
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
    splits: z.array(splitRowSchema).optional()
  })
  .superRefine((data, ctx) => {
    if (data.transactionType === TransactionType.TRANSFER) {
      if (data.amount == null) {
        ctx.addIssue({
          code: 'custom',
          message: 'validation.positive',
          path: [
            'amount'
          ]
        })
      }
      if (
        !data.transferToAccountId ||
        data.transferToAccountId === data.accountId
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'validation.accountRequired',
          path: [
            'transferToAccountId'
          ]
        })
      }
      return
    }

    if (
      data.transactionType === TransactionType.EXPENSE ||
      data.transactionType === TransactionType.INCOME
    ) {
      if (!data.name.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'validation.nameRequired',
          path: [
            'name'
          ]
        })
      }
    }

    if (data.transactionType === TransactionType.EXPENSE) {
      const hasSplits = data.splits && data.splits.length > 0
      if (!hasSplits) {
        if (data.amount == null) {
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
        if (!data.category) {
          ctx.addIssue({
            code: 'custom',
            message: 'validation.categoryRequired',
            path: [
              'category'
            ]
          })
        }
      } else {
        data.splits?.forEach((row, i) => {
          const parsed = splitRowSchema.safeParse(row)
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
      }
      return
    }

    if (data.transactionType === TransactionType.INCOME) {
      if (data.amount == null) {
        ctx.addIssue({
          code: 'custom',
          message: 'validation.positive',
          path: [
            'amount'
          ]
        })
      }
      if (!data.category) {
        ctx.addIssue({
          code: 'custom',
          message: 'validation.categoryRequired',
          path: [
            'category'
          ]
        })
      }
    }
  })

export type ParsedDrawerFormValues = z.infer<typeof drawerFormSchema>
