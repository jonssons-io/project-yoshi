import { accountHandlers } from './accounts'
import { allocationHandlers } from './allocations'
import { billHandlers } from './bills'
import { budgetHandlers } from './budgets'
import { categoryHandlers } from './categories'
import { householdHandlers } from './households'
import { incomeHandlers } from './income'
import { invitationHandlers } from './invitations'
import { recipientHandlers } from './recipients'
import { transactionHandlers } from './transactions'

export const handlers = [
  ...householdHandlers,
  ...accountHandlers,
  ...budgetHandlers,
  ...categoryHandlers,
  ...transactionHandlers,
  ...billHandlers,
  ...incomeHandlers,
  ...recipientHandlers,
  ...invitationHandlers,
  ...allocationHandlers
]
