import type { QueryClient } from "@tanstack/react-query";
import type { ConvexReactClient } from "convex/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import Header from "../components/Header";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { createServerFn } from "@tanstack/react-start";
import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { auth } from "@clerk/tanstack-react-start/server";

import appCss from "../styles.css?url";

interface MyRouterContext {
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
  convexQueryClient: ConvexQueryClient;
}

const fetchClerkAuth = createServerFn({ method: "GET" }).handler(async () => {
  const { userId, getToken } = await auth();

  const token = await getToken({ template: "convex" });

  return { userId, token };
});

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
        title: "Deals Radar - Latest Deals",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const auth = await fetchClerkAuth();
    const { userId, token } = auth;

    // During SSR only (the only time serverHttpClient exists),
    // set the Clerk auth token to make HTTP queries with.
    if (token) {
      context.convexQueryClient.serverHttpClient?.setAuth(token);
    }

    return {
      userId,
      token,
    };
  },

  shellComponent: RootDocument,
});

function RootOutlet({ children }: { children: React.ReactNode }) {
  const context = Route.useRouteContext();
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={context.convexClient} useAuth={useAuth}>
        <Header />
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <RootOutlet>{children}</RootOutlet>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            {
              name: "Tanstack Query",
              render: <ReactQueryDevtools />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
