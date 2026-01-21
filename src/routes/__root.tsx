import { ClerkProvider } from '@clerk/tanstack-react-start'
import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import type { TRPCOptionsProxy } from '@trpc/tanstack-react-query'
import { trpcClient } from '@/integrations/tanstack-query/root-provider'
import { TRPCProvider } from '@/integrations/trpc/react'
import type { TRPCRouter } from '@/integrations/trpc/router'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import StoreDevtools from '../lib/demo-store-devtools'
import appCss from '../styles.css?url'

interface MyRouterContext {
	queryClient: QueryClient

	trpc: TRPCOptionsProxy<TRPCRouter>
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: 'utf-8'
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1'
			},
			{
				title: 'Yoshi Budget App'
			}
		],
		links: [
			{
				rel: 'stylesheet',
				href: appCss
			}
		]
	}),

	shellComponent: RootDocument
})

function RootDocument({ children }: { children: React.ReactNode }) {
	const context = Route.useRouteContext()

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<QueryClientProvider client={context.queryClient}>
					<TRPCProvider
						trpcClient={trpcClient}
						queryClient={context.queryClient}
					>
						<ClerkProvider
							publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
						>
							{children}
							<TanStackDevtools
								config={{
									position: 'bottom-right'
								}}
								plugins={[
									{
										name: 'Tanstack Router',
										render: <TanStackRouterDevtoolsPanel />
									},
									StoreDevtools,
									TanStackQueryDevtools
								]}
							/>
						</ClerkProvider>
					</TRPCProvider>
				</QueryClientProvider>
				<Scripts />
			</body>
		</html>
	)
}
