import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { QueryClient } from "@tanstack/react-query";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL!;
  if (!CONVEX_URL) {
    console.error("missing envar VITE_CONVEX_URL");
  }
  const convex = new ConvexReactClient(CONVEX_URL, {
    unsavedChangesWarning: false,
  });
  const convexQueryClient = new ConvexQueryClient(convex);

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  });
  convexQueryClient.connect(queryClient);

  const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    context: { queryClient, convexClient: convex, convexQueryClient },
    scrollRestoration: true,
    defaultErrorComponent: ({ error }) => (
      <div>
        <h1>Error</h1>
        <p>{error.message}</p>
      </div>
    ),
    Wrap: (props: { children: React.ReactNode }) => (
      <ConvexProvider client={convex}>{props.children}</ConvexProvider>
    ),
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
}
