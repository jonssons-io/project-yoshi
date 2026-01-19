import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClientProvider } from "@tanstack/react-query";

import { ClerkProvider } from "@clerk/tanstack-react-start";

import StoreDevtools from "../lib/demo-store-devtools";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import { TRPCProvider } from "@/integrations/trpc/react";
import { trpcClient } from "@/integrations/tanstack-query/root-provider";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";

import type { TRPCRouter } from "@/integrations/trpc/router";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";

interface MyRouterContext {
  queryClient: QueryClient;

  trpc: TRPCOptionsProxy<TRPCRouter>;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Yoshi Budget App",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const context = Route.useRouteContext();

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
                  position: "bottom-right",
                }}
                plugins={[
                  {
                    name: "Tanstack Router",
                    render: <TanStackRouterDevtoolsPanel />,
                  },
                  StoreDevtools,
                  TanStackQueryDevtools,
                ]}
              />
            </ClerkProvider>
          </TRPCProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
