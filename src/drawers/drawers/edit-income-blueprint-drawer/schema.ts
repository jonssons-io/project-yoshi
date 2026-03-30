import { z } from 'zod'

import { RecurrenceType } from '@/api/generated/types.gen'

export const editIncomeBlueprintObjectSchema = z.object({
  name: z.string().min(1, 'validation.nameRequired'),
  incomeSourceId: z.string().min(1, 'validation.sourceRequired'),
  accountId: z.string().min(1, 'validation.accountRequired'),
  amount: z.number().positive('validation.positive'),
  recurrenceType: z.nativeEnum(RecurrenceType),
  customIntervalDays: z.number().optional().nullable(),
  changeDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  categoryId: z.string().optional()
})

export const editIncomeBlueprintSchema =
  editIncomeBlueprintObjectSchema.superRefine((data, ctx) => {
    if (data.recurrenceType !== RecurrenceType.CUSTOM) return
    const n = data.customIntervalDays
    if (n == null || n < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.customIntervalRequired',
        path: ['customIntervalDays']
      })
    }
  })

export type EditIncomeBlueprintFormValues = z.infer<
  typeof editIncomeBlueprintSchema
>
