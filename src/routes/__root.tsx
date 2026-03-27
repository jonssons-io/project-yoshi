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
import { MockProvider } from '@/__mocks__/MockProvider'
import { Toaster } from '@/components/ui/sonner'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import '../lib/i18n'
import appCss from '../styles.css?url'

interface MyRouterContext {
  queryClient: QueryClient
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
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com'
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous'
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Halant:wght@300;400;500;600;700&family=Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000&display=swap'
      },
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
    <html
      lang="sv"
      className="h-full w-full overflow-hidden"
    >
      <head>
        <HeadContent />
      </head>
      <body className="flex h-full w-full overflow-hidden justify-center items-center">
        <MockProvider>
          <QueryClientProvider client={context.queryClient}>
            <ClerkProvider
              publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
            >
              {children}
              <Toaster />
              <TanStackDevtools
                config={{
                  position: 'bottom-right'
                }}
                plugins={[
                  {
                    name: 'Tanstack Router',
                    render: <TanStackRouterDevtoolsPanel />
                  },
                  TanStackQueryDevtools
                ]}
              />
            </ClerkProvider>
          </QueryClientProvider>
        </MockProvider>
        <Scripts />
      </body>
    </html>
  )
}
