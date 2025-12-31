# AGENTS.md

## Commands

- `pnpm dev` - Start dev server on port 3000
- `pnpm build` - Production build
- `pnpm test` - Run all tests (vitest)
- `pnpm test path/to/file.test.ts` - Run single test file
- `pnpm lint` - Lint with oxlint (type-aware)
- `pnpm format` - Format with Prettier

## Architecture

- **Frontend**: React 19 + TanStack Router/Query + TanStack Start (SSR)
- **Backend**: Convex (serverless DB + functions in `convex/`)
- **Styling**: Tailwind CSS v4 + shadcn/ui components in `src/components/ui/`
- **Schema**: `convex/schema.ts` defines `deals` and `stores` tables

## Code Style

- TypeScript strict mode; path alias `@/*` → `./src/*`
- Use `v` validators from `convex/values` for Convex schemas
- shadcn components: `pnpx shadcn@latest add <component>`
- Convex system fields (`_id`, `_creationTime`) are auto-generated—don't redefine
- Zod schemas in `convex/zSchemas.ts`; Convex types in `convex/types.ts`
- Prefer named exports; use for icons

<!-- effect-solutions:start -->

## Effect Best Practices

**Before implementing Effect features**, run `effect-solutions list` and read the relevant guide.

Topics include: services and layers, data modeling, error handling, configuration, testing, HTTP clients, CLIs, observability, and project structure.

**Effect Source Reference:** `~/.local/share/effect-solutions/effect`
Search here for real implementations when docs aren't enough.

<!-- effect-solutions:end -->
