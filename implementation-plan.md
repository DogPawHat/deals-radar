# Implementation Plan

Goal: implement entire spec using TanStack Start + Convex + Confect + Effect. Tests first for each task. Tasks are agent-sized, dependency-aware.

## Task Legend

- Each task: write tests first, then implementation, then update docs if needed.
- Dependencies listed as `deps:` task ids.
- Each task includes a description (>=2 sentences) and target locations for new code.
- Completion status is tracked here, not in `SPEC.md`.

## Tasks

T1. Repo baseline + tooling

- description: Establish a reliable local workflow so agents can run tests and linting consistently across tasks. This task also sets the project-wide environment variable contract so later tasks can rely on validated config.
- completion: [ ]
- locations: `package.json`, `docs/ENV.md`, `.env.example`, `src/env.ts` (t3 env), `convex/env.ts` (Effect Config helper)
- tests: smoke tests for `pnpm test`, `pnpm lint`, `pnpm typecheck`; env var presence check
- impl: add missing scripts/configs, document commands, create `.env.example` and env var doc block
- env vars:
  - add `.env.example` with required keys (no secrets)
  - document local `.env`, Netlify deploy vars, Convex dashboard vars
  - react/client env via `@t3-oss/env-*` (t3 env) for `import.meta.env` validation
  - convex env via Effect `Config` (as in `convex/firecrawlNodeActions.ts`) for runtime config
- deps: none

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

```env
VITE_CONVEX_URL=
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER_DOMAIN=
FIRECRAWL_API_KEY=
```

T2. Convex schema + types

- description: Implement the database schema exactly as specified so all server code can share a stable contract. This ensures indexes exist for queries and deduplication to work without costly scans.
- completion: [ ]
- locations: `convex/schema.ts`, `convex/eSchemas.ts` (Effect schemas if missing)
- tests: schema validation snapshots for each table
- impl: update `convex/schema.ts` with spec fields and indexes
- deps: T1

```ts
export const deals = defineTable(
  Schema.Struct({
    storeId: Id.Id("stores"),
    title: Schema.String,
    url: Schema.String,
    canonicalUrl: Schema.String,
    dedupKey: Schema.String,
    image: Schema.optional(Schema.String),
    price: Schema.Number,
    currency: Schema.String,
    msrp: Schema.optional(Schema.Number),
  }),
).index("by_dedupeKey_for_store", ["dedupKey", "storeId"]);
```

T3. Confect/Effect helpers

- description: Centralize Effect helpers so all Convex actions/queries use consistent error handling and config access. This reduces copy/paste errors and keeps Convex code aligned with Effect conventions.
- completion: [ ]
- locations: `convex/confect.ts`, `convex/lib/effect.ts`, `convex/env.ts`
- tests: Effect roundtrip for schema encode/decode
- impl: create Effect helpers for decode, config, and error tagging
- deps: T2

```ts
export const decode =
  <A>(schema: Schema.Schema<A>) =>
  (input: unknown) =>
    Schema.decodeUnknown(schema)(input);
```

T4. Auth guard (admin) via Clerk + Convex auth checks

- description: Add Clerk to TanStack Start for UI auth and integrate Clerk JWTs with Convex for server-side auth enforcement. This task ensures the admin area is protected both at the route level and in all Convex admin functions.
- completion: [ ]
- locations: `src/start.ts`, `src/routes/__root.tsx`, `src/routes/admin/_layout.tsx`, `convex/auth.config.ts`, `convex/admin/*.ts`
- tests: unauthenticated access to `/admin/*` redirects to `/sign-in`; Convex admin mutations reject when no user
- impl: add `@clerk/tanstack-react-start`, `clerkMiddleware()` in `src/start.ts`, wrap root in `<ClerkProvider>`, server `auth()` check in `beforeLoad`, add `getAuthUserId` checks in Convex admin functions, configure Clerk as Convex auth provider
- note: Convex + Clerk config steps (from Convex auth guide)
  - create Clerk JWT template named `convex`; copy Issuer URL (Frontend API URL)
  - set `CLERK_JWT_ISSUER_DOMAIN` in Convex env (dev + prod)
  - add `convex/auth.config.ts` with provider `domain` + `applicationID: "convex"`
  - run `npx convex dev` (dev) or `npx convex deploy` (prod) to sync auth config
  - use `ConvexProviderWithClerk` wrapped by `ClerkProvider` and pass Clerk `useAuth`
- deps: T1

```tsx
// src/start.ts
import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { createStart } from "@tanstack/react-start";

export const startInstance = createStart(() => ({
  requestMiddleware: [clerkMiddleware()],
}));
```

```tsx
// src/routes/__root.tsx
import { ClerkProvider } from "@clerk/tanstack-react-start";

function RootDocument({ children }: { children: React.ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
```

```ts
// convex/auth.config.ts
import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
```

T5. Public data queries

- description: Build server queries for each public tab and filtering rule so the UI can subscribe live. This task defines pagination behavior that will be reused by the feed and list views.
- completion: [ ]
- locations: `convex/deals.ts`, `convex/queries/deals.ts`
- tests: each tab ordering and minimum discount filter
- impl: Convex query functions + cursor pagination
- deps: T2, T3

```ts
return db
  .query("deals")
  .filter((q) => q.gte(q.field("percentOff"), 5))
  .order("desc");
```

T6. Deal deduplication pipeline

- description: Introduce a deterministic dedup key so crawls do not create duplicates for the same product. This task formalizes the key derivation and validates it in tests.
- completion: [ ]
- locations: `convex/lib/dedup.ts`, `convex/actions/crawl.ts`
- tests: deterministic key generation
- impl: helper in crawl write path
- deps: T2, T3

```ts
export const dedupKey = (canonicalUrl: string, title: string) =>
  createHash("sha256").update(`${canonicalUrl}::${title}`).digest("hex");
```

T7. Firecrawl schema + fetch action

- description: Implement the Firecrawl client action to fetch and validate deal data using the JSON schema. This task handles success and failure paths consistently with Effect errors.
- completion: [ ]
- locations: `convex/firecrawlNodeActions.ts`, `convex/actions/runFirecrawl.ts`
- tests: success parse + failure paths (invalid schema, fetch error)
- impl: `runFirecrawl` action with schema validation and structured errors
- deps: T2, T3, T6

```ts
export const runFirecrawl = action({
  args: { url: v.string() },
  handler: async (ctx, { url }) => firecrawl.fetch({ url, schema }),
});
```

T8. Robots.txt fetch + parse

- description: Fetch and store robots.txt rules on source save to enforce crawler rules. This task ensures the admin UI can display rules and block runs when necessary.
- completion: [ ]
- locations: `convex/robots.ts`, `convex/admin/sources.ts`, `src/features/admin/robots.tsx`
- tests: rule parsing, blocked detection for sample paths
- impl: parser + store rules in sources
- deps: T2, T3

```ts
const rules = parseRobotsTxt(text).forUserAgent("*");
const isBlocked = !rules.isAllowed(pathname);
```

T9. Crawl jobs queue + cron

- description: Create the crawl queue logic with concurrency and rate limits to meet the spec. This task includes retries with backoff and persistent job tracking.
- completion: [ ]
- locations: `convex/cron.ts`, `convex/crawlJobs.ts`, `convex/actions/crawlTick.ts`
- tests: enqueue due sources, retry schedule (1m/4m/10m)
- impl: `crawlTick` + job state transitions
- deps: T2, T3, T7, T8

```ts
const backoffMs = [60_000, 240_000, 600_000][attempt - 1];
const shouldRetry = attempt < 3;
```

T10. Write deals + price history

- description: Persist crawled deals and append price history entries for each observation. This task also enforces the 5% discount minimum at write time.
- completion: [ ]
- locations: `convex/actions/runFirecrawl.ts`, `convex/deals.ts`, `convex/priceHistory.ts`
- tests: new deal insert, existing deal update, history append
- impl: write pipeline used by crawl action
- deps: T2, T6, T7

```ts
await db.insert("priceHistory", {
  dealId,
  price: item.price,
  at: Date.now(),
});
```

T11. Admin: sources list + actions

- description: Build the admin sources list UI with status indicators and action buttons. This task wires the list to Convex queries and provides the Run Now cooldown.
- completion: [ ]
- locations: `src/routes/admin/sources.tsx`, `src/features/admin/sourcesList.tsx`, `convex/admin/sources.ts`
- tests: status badges, run now disabled during cooldown
- impl: list view + queries + mutations
- deps: T4, T5, T8, T9

```tsx
<button disabled={cooldownMs > 0} onClick={() => runNow(sourceId)}>
  RUN NOW
</button>
```

T12. Admin: add/edit source modal

- description: Implement add/edit flow with validation and robots preview on URL blur. This task keeps the form logic isolated from list rendering for easier testing.
- completion: [ ]
- locations: `src/features/admin/sourceModal.tsx`, `src/features/admin/sourceForm.tsx`, `convex/admin/sources.ts`
- tests: validation errors, robots rules render on blur
- impl: modal form, save mutation
- deps: T11

```tsx
<input name="url" onBlur={(e) => fetchRobots(e.currentTarget.value)} />
```

T13. Admin: crawl jobs panel

- description: Add expandable crawl job history with error details and copy. This task ensures admins can diagnose failures quickly.
- completion: [ ]
- locations: `src/features/admin/crawlJobsPanel.tsx`, `convex/admin/crawlJobs.ts`
- tests: expand/collapse, copy error payload
- impl: panel UI + query for recent jobs
- deps: T11, T9

```tsx
<button onClick={() => navigator.clipboard.writeText(job.errorDetails ?? "")}>COPY</button>
```

T14. Public: deals feed UI

- description: Build the public feed with tab filters, grid/list toggle, and infinite scroll. This task ensures the view state is persisted and compatible with live Convex subscriptions.
- completion: [ ]
- locations: `src/routes/index.tsx`, `src/features/deals/dealsFeed.tsx`, `src/features/deals/dealCard.tsx`
- tests: tab state, view toggle persistence, skeletons
- impl: `/` page UI
- deps: T5

```tsx
const [view, setView] = useLocalStorage("dealView", "grid");
```

T15. Public: deal detail page

- description: Implement the deal detail page with hero image, pricing, and price history chart. This task also wires the external link to open in a new tab.
- completion: [ ]
- locations: `src/routes/deals/$id.tsx`, `src/features/deals/priceHistoryChart.tsx`
- tests: chart data mapping, link opens new tab
- impl: `/deals/:id` page + chart component
- deps: T5, T10

```tsx
<a href={deal.url} target="_blank" rel="noreferrer">
  VIEW DEAL
</a>
```

T16. Shared UI system (Brutalist)

- description: Implement global styles and core components that follow the Supermarket Brutalist style. This task provides consistent visuals across admin and public routes.
- completion: [ ]
- locations: `src/styles.css`, `src/components/ui/*`
- tests: class snapshots for key components
- impl: global CSS tokens, buttons, tabs, cards, banners
- deps: T1

```css
:root {
  --color-bg: #ffffff;
  --color-text: #000000;
  --color-accent: #ffe500;
  --border-strong: 3px solid #000000;
}
```

T17. Toasts + notifications

- description: Provide a toast system that matches the style guide and supports success/error/info/warning variants. This task also integrates toasts into crawl and save flows.
- completion: [ ]
- locations: `src/components/ui/toast.tsx`, `src/lib/toastStore.ts`, `src/features/admin/*`
- tests: success/error/info/warn styles and timeouts
- impl: toast store + UI component + usage in flows
- deps: T11, T14, T16

```ts
toast.show({
  variant: "error",
  title: "CRAWL FAILED",
  timeoutMs: 5000,
});
```

T18. Loading/empty/error states

- description: Implement skeletons, empty states, and error banners across public and admin screens. This ensures users always have a clear, branded state when data is missing or loading.
- completion: [ ]
- locations: `src/components/ui/emptyState.tsx`, `src/components/ui/skeleton.tsx`, `src/components/ui/errorBanner.tsx`
- tests: empty state rendering, error banner visibility
- impl: components wired into list/detail/admin pages
- deps: T14, T15, T16

```tsx
{
  deals.length === 0 ? <EmptyState label="NO DEALS FOUND" /> : <DealGrid />;
}
```

T19. Accessibility pass

- description: Verify focus styles, aria labels, and headings across the UI. This task ensures the interface is keyboard accessible and meets the spec's a11y requirements.
- completion: [ ]
- locations: `src/components/ui/*`, `src/routes/*`
- tests: a11y snapshots for interactive elements
- impl: adjust markup + focus ring styles
- deps: T14, T15, T16

```css
:focus-visible {
  outline: 3px solid #000000;
  outline-offset: 2px;
}
```

T20. End-to-end verification

- description: Build an e2e harness that runs through crawl -> feed -> detail with mocked Firecrawl and Convex. This provides a final integration check for the entire data path.
- completion: [ ]
- locations: `tests/e2e/*`, `convex/test/*`, `src/tests/*`
- tests: e2e flow with mocked Firecrawl + Convex test env
- impl: e2e harness and fixtures
- deps: T7, T9, T10, T14, T15

```ts
test("crawl shows in feed", async () => {
  await seedCrawlJob();
  await expect(page.getByText("NEWEST")).toBeVisible();
});
```
