/**
 * Demo Index - List of all demo pages
 */

import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/demo/')({
  component: DemoIndex,
})

function DemoIndex() {
  const demos = [
    {
      category: 'TanStack Start',
      items: [
        {
          title: 'Server Functions',
          path: '/demo/start/server-funcs',
          description: 'Server-side functions with type safety',
        },
        {
          title: 'API Request',
          path: '/demo/start/api-request',
          description: 'Making API requests',
        },
        {
          title: 'SSR Demos',
          path: '/demo/start/ssr',
          description: 'Server-side rendering examples',
        },
        {
          title: 'SSR - SPA Mode',
          path: '/demo/start/ssr/spa-mode',
          description: 'Single page application mode',
        },
        {
          title: 'SSR - Full SSR',
          path: '/demo/start/ssr/full-ssr',
          description: 'Full server-side rendering',
        },
        {
          title: 'SSR - Data Only',
          path: '/demo/start/ssr/data-only',
          description: 'SSR with data fetching only',
        },
      ],
    },
    {
      category: 'Integrations',
      items: [
        {
          title: 'Clerk Authentication',
          path: '/demo/clerk',
          description: 'User authentication with Clerk',
        },
        {
          title: 'Prisma Database',
          path: '/demo/prisma',
          description: 'Database operations with Prisma',
        },
        {
          title: 'tRPC Todo',
          path: '/demo/trpc-todo',
          description: 'Type-safe API with tRPC',
        },
      ],
    },
    {
      category: 'TanStack Libraries',
      items: [
        {
          title: 'TanStack Query',
          path: '/demo/tanstack-query',
          description: 'Data fetching and caching',
        },
        {
          title: 'TanStack Table',
          path: '/demo/table',
          description: 'Powerful data tables',
        },
        {
          title: 'TanStack Store',
          path: '/demo/store',
          description: 'State management',
        },
      ],
    },
    {
      category: 'Forms',
      items: [
        {
          title: 'Simple Form',
          path: '/demo/form/simple',
          description: 'Basic form example',
        },
        {
          title: 'Address Form',
          path: '/demo/form/address',
          description: 'Complex form with validation',
        },
        {
          title: 'Form System',
          path: '/demo/form-system',
          description: 'Custom form system documentation',
        },
      ],
    },
  ]

  return (
    <div className="container py-4">

        <h1 className="text-3xl font-bold mb-2">Demo Pages</h1>


      <div className="space-y-8">
        {demos.map((section) => (
          <div key={section.category}>
            <h2 className="text-2xl font-semibold mb-4">{section.category}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {section.items.map((demo) => (
                <Link key={demo.path} to={demo.path}>
                  <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-lg">{demo.title}</CardTitle>
                      <CardDescription>{demo.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
