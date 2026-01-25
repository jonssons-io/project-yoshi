import type { TRPCRouterRecord } from '@trpc/server'
import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from './init'
import { accountsRouter } from './routers/accounts'
import { billsRouter } from './routers/bills'
import { budgetsRouter } from './routers/budgets'
import { categoriesRouter } from './routers/categories'
import { householdsRouter } from './routers/households'
import { incomeRouter } from './routers/income'
import { invitationsRouter } from './routers/invitations'
import { recipientsRouter } from './routers/recipients'
import { transactionsRouter } from './routers/transactions'
import { transfersRouter } from './routers/transfers'

const todos = [
	{ id: 1, name: 'Get groceries' },
	{ id: 2, name: 'Buy a new phone' },
	{ id: 3, name: 'Finish the project' }
]

const todosRouter = {
	list: publicProcedure.query(() => todos),
	add: publicProcedure
		.input(z.object({ name: z.string() }))
		.mutation(({ input }) => {
			const newTodo = { id: todos.length + 1, name: input.name }
			todos.push(newTodo)
			return newTodo
		})
} satisfies TRPCRouterRecord

export const trpcRouter = createTRPCRouter({
	todos: todosRouter,
	households: householdsRouter,
	budgets: budgetsRouter,
	categories: categoriesRouter,
	accounts: accountsRouter,
	transactions: transactionsRouter,
	bills: billsRouter,
	recipients: recipientsRouter,
	transfers: transfersRouter,
	income: incomeRouter,
	invitations: invitationsRouter
})
export type TRPCRouter = typeof trpcRouter
