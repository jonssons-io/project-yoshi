import { z } from 'zod'

/** Edit single income instance — aligned with `UpdateIncomeInstanceRequest` (name, amount, date, account, category). */
export const editIncomeInstanceObjectSchema = z.object({
  name: z.string().min(1, 'validation.nameRequired'),
  incomeSourceId: z.string().min(1, 'validation.sourceRequired'),
  accountId: z.string().min(1, 'validation.accountRequired'),
  amount: z.number().positive('validation.positive'),
  expectedDate: z.date({
    message: 'validation.dateRequired'
  }),
  categoryId: z.string().optional()
})

export const editIncomeInstanceSchema = editIncomeInstanceObjectSchema

export type EditIncomeInstanceFormValues = z.infer<
  typeof editIncomeInstanceSchema
>
