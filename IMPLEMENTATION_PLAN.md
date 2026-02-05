# Implementation Plan: Dark Data Terminal Redesign

Goal: transform the current Supermarket Brutalist UI into a Dark Data Terminal aesthetic per the revised SPEC.md. All backend logic, data queries, auth, and crawl pipeline remain unchanged — this is a pure frontend/styling effort.

## Task Legend

- `[x]` = done
- `[-]` = in progress
- `[ ]` = pending

---

## T1. Swap fonts — install Geist Sans + JetBrains Mono

- Dependencies: none

- [x] `pnpm remove @fontsource-variable/work-sans @fontsource/archivo-black`
- [x] `pnpm add @fontsource/geist-sans @fontsource/jetbrains-mono` (using non-variable packages)
- [x] Update `src/styles.css`:
  - Replaced font imports with Geist Sans (400-700) and JetBrains Mono (400-700)
  - In `:root`: updated `--font-display` and `--font-body` to Geist Sans; added `--font-mono` for JetBrains Mono
  - In `@theme inline`: updated `--font-sans`, `--font-display`, `--font-body` to Geist Sans; added `--font-mono` as JetBrains Mono
  - In `@layer base`: kept `h1-h6` using `font-sans font-bold`
- [x] Verify no import errors: `pnpm typecheck`

Files: `package.json`, `src/styles.css`

---

## T2. Rewrite CSS theme tokens for dark terminal palette

- Dependencies: none

Replace all `:root` and `.dark` tokens with a single dark-only token set. Remove the `.dark` class mechanism — the app is dark by default.

- [x] In `:root`, set new token values per SPEC:

| Token                      | New Value               | Notes                           |
| -------------------------- | ----------------------- | ------------------------------- |
| `--background`             | `oklch(0.04 0 0)`       | #0A0A0B                         |
| `--foreground`             | `oklch(0.91 0.005 280)` | #E8E8ED                         |
| `--card`                   | `oklch(0.09 0 0)`       | #141416 (surface)               |
| `--card-foreground`        | `oklch(0.91 0.005 280)` | #E8E8ED                         |
| `--popover`                | `oklch(0.09 0 0)`       | #141416                         |
| `--popover-foreground`     | `oklch(0.91 0.005 280)` | #E8E8ED                         |
| `--primary`                | `oklch(0.62 0.19 250)`  | #3B82F6 (accent-blue)           |
| `--primary-foreground`     | `oklch(1 0 0)`          | white                           |
| `--secondary`              | `oklch(0.12 0 0)`       | #1C1C1F (surface-hover)         |
| `--secondary-foreground`   | `oklch(0.91 0.005 280)` | #E8E8ED                         |
| `--muted`                  | `oklch(0.12 0 0)`       | #1C1C1F                         |
| `--muted-foreground`       | `oklch(0.46 0.005 280)` | #6E6E7A                         |
| `--accent`                 | `oklch(0.12 0 0)`       | #1C1C1F                         |
| `--accent-foreground`      | `oklch(0.91 0.005 280)` | #E8E8ED                         |
| `--destructive`            | `oklch(0.59 0.23 25)`   | #FF4444                         |
| `--destructive-foreground` | `oklch(1 0 0)`          | white                           |
| `--border`                 | `oklch(0.16 0 0)`       | #222225 (border-subtle)         |
| `--input`                  | `oklch(0.22 0 0)`       | #333338 (border-active)         |
| `--ring`                   | `oklch(0.62 0.19 250)`  | #3B82F6 (accent-blue for focus) |

- [x] Replace brand colors:

| Old Token               | New Token                | Value                                       |
| ----------------------- | ------------------------ | ------------------------------------------- |
| `--color-safety-yellow` | `--color-green-gain`     | `oklch(0.85 0.25 155)` (#00FF88)            |
| `--color-signal-red`    | `--color-red-loss`       | `oklch(0.59 0.23 25)` (#FF4444)             |
| `--color-concrete-gray` | remove                   | Use `--muted-foreground` instead            |
| `--color-success`       | keep, update             | `oklch(0.85 0.25 155)` (same as green-gain) |
| `--color-error-bg`      | `--color-red-loss-muted` | `oklch(0.59 0.23 25 / 0.13)`                |

- [x] Add new tokens: `--color-green-gain-muted`: `oklch(0.85 0.25 155 / 0.13)`, `--color-accent-amber`: `oklch(0.77 0.17 75)` (#F59E0B)
- [x] Update `@theme inline` to expose new tokens as Tailwind utilities
- [x] Remove `.dark { ... }` block — no longer needed
  - [x] Remove `@custom-variant dark` — no longer needed
- [x] Update `--radius` from `0px` to `4px`; update `--radius-sm` to `2px`, `--radius-md` to `4px`, `--radius-lg` to `4px`, leave `--radius-xl` through `--radius-4xl` at `4px`
- [x] Update `:focus-visible` from `3px solid #000000` to `2px solid var(--ring)` with `outline-offset: 2px`
- [x] Remove or rewrite `@layer components` classes (`.btn-primary`, `.btn-secondary`, `.tab-active`, `.tab-inactive`, `.card-brutalist`, `.input-brutalist`) — these are unused dead code but should either be removed or updated
- [x] Verify build: `pnpm build`

Files: `src/styles.css`

---

## T3. Update root document shell

- Dependencies: none

- [x] In `src/routes/__root.tsx` `RootDocument`: add `className="dark"` to `<html>` tag (enables dark class if any shadcn components still reference `dark:` utilities)
- [x] On `<body>`: no changes needed (already uses `bg-background text-foreground` via base layer)

Files: `src/routes/__root.tsx`

---

## T4. Restyle Header component

- Dependencies: T1, T2, T5

- [x] Replace current `Header.tsx` with dark terminal style:
  - Slim 48px bar: `h-12` (down from `h-16`)
  - Background: `bg-card` (surface color) with `border-b border-border`
  - Brand text: "DEALS" in `text-muted-foreground` + "RADAR" in `text-green-gain`, `font-mono` — both monospace
  - Admin button: `variant="ghost"` with `text-muted-foreground`
  - Container: widen to `max-w-[1400px]`
- [x] Replace all hardcoded `bg-white`, `border-black` classes

Files: `src/components/Header.tsx`

---

## T5. Restyle shadcn Button component

- Dependencies: T1, T2

- [x] Rewrite CVA variants in `src/components/ui/button.tsx`:
  - `default` (primary): `bg-primary text-primary-foreground` hover lightens slightly
  - `destructive`: `bg-destructive text-destructive-foreground` hover lightens
  - `outline`: `border border-input bg-transparent text-foreground` hover `bg-secondary`
  - `secondary`: `bg-secondary text-secondary-foreground` hover lightens
  - `ghost`: `hover:bg-secondary text-muted-foreground hover:text-foreground`
  - `link`: `text-primary underline-offset-4 hover:underline`
- [x] Remove all hardcoded `bg-black`, `text-black`, `bg-white`, `text-white`, `border-black` references
- [x] Keep uppercase + tracking-wide + font-bold base styles (fits terminal aesthetic)

Files: `src/components/ui/button.tsx`

---

## T6. Restyle shadcn Card component

- Dependencies: T1, T2

- [x] Update `src/components/ui/card.tsx`:
  - Base: `bg-card text-card-foreground border border-border` (1px border, not 2px)
  - Remove `hover:border-[3px] hover:border-black hover:bg-safety-yellow`
  - New hover: `hover:bg-secondary` (subtle background shift)
  - `rounded-sm` (uses new 2px radius token)
- [x] Update `CardTitle`: change `font-display` to `font-sans`

Files: `src/components/ui/card.tsx`

---

## T7. Restyle shadcn Badge, Tabs, Skeleton, DiscountBadge, ErrorBanner, Empty

- Dependencies: T1, T2, T5

- [x] `badge.tsx`: update variant colors for dark theme — `default` uses `bg-secondary text-foreground`, `destructive` uses `bg-red-loss-muted text-red-loss`
- [x] `tabs.tsx`:
  - Line variant active: change `after:bg-foreground` underline to `after:bg-green-gain`
  - Trigger text: inactive `text-muted-foreground`, active `text-foreground`
  - Remove any `bg-safety-yellow` or `border-black` references
- [x] `skeleton.tsx`: change `bg-muted` to `bg-card` with subtle shimmer (keep `animate-pulse`)
- [x] `discount-badge.tsx`: replace `bg-signal-red text-white font-display` with `bg-green-gain-muted text-green-gain font-mono font-semibold`
- [x] `error-banner.tsx`: replace `bg-error-bg border-2 border-black` with `bg-red-loss-muted border-l-2 border-red-loss text-foreground`; update retry button to `variant="secondary"`
- [x] `empty.tsx`: ensure `text-muted-foreground` is used (likely already fine)

Files: `src/components/ui/badge.tsx`, `src/components/ui/tabs.tsx`, `src/components/ui/skeleton.tsx`, `src/components/ui/discount-badge.tsx`, `src/components/ui/error-banner.tsx`, `src/components/ui/empty.tsx`

---

## T8. Restyle remaining shadcn components (dropdown, combobox, select, input, alert-dialog, separator)

- Dependencies: T1, T2

- [x] `dropdown-menu.tsx`: Uses `bg-popover text-popover-foreground`, `focus:bg-accent` - works with new tokens
- [x] `combobox.tsx`: Uses same patterns as dropdown - works with new tokens
- [x] `select.tsx`: Uses `bg-popover`, `focus:bg-accent` - works with new tokens
- [x] `input.tsx`: Uses `border-input`, `bg-transparent` - works with new tokens
- [x] `textarea.tsx`: Uses same patterns as input - works with new tokens
- [x] `alert-dialog.tsx`: Uses `bg-background`, `bg-black/10` overlay (appropriate for modal backdrop)
- [x] `separator.tsx`: Works via `bg-border` token

Files: `src/components/ui/dropdown-menu.tsx`, `src/components/ui/combobox.tsx`, `src/components/ui/select.tsx`, `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`, `src/components/ui/alert-dialog.tsx`

---

## T9. Restyle DealsFeed — tabs, view toggle, skeletons, error/empty states

- Dependencies: T2, T5, T7

- [x] Updated `src/features/deals/dealsFeed.tsx`:
  - Tab bar: removed `border-b-3 border-black`, now uses `border-b border-border`
  - Tab triggers: removed hardcoded `data-[active]:bg-safety-yellow data-[active]:border-b-3 data-[active]:border-black`, using Tabs component styling with green underline
  - Skeleton: replaced `bg-white border-2 border-black` with `bg-card rounded-sm`, removed inner border dividers
  - Error state: replaced `bg-error-bg border-2 border-black` with `bg-red-loss-muted border-l-2 border-red-loss rounded-sm`
  - Empty state: updated to use `text-muted-foreground`
  - Changed `font-display` to `font-sans` throughout

Files: `src/features/deals/dealsFeed.tsx`

---

## T10. Restyle DealCard — grid and list variants

- Dependencies: T1, T2, T9

- [x] Updated list view in `src/features/deals/dealCard.tsx`:
  - Replaced `bg-muted border border-black` with `bg-secondary rounded-sm`
  - Replaced `bg-concrete-gray` placeholder with `bg-secondary`
  - Changed `font-display` to `font-sans` for title
  - Changed `text-concrete-gray` to `text-muted-foreground`
  - Changed price from `font-display` to `font-mono font-semibold text-green-gain`
  - Changed original price to `font-mono text-muted-foreground line-through`
  - Replaced `bg-signal-red text-white rotate-[-5deg]` discount stamp with `bg-green-gain-muted text-green-gain` pill
- [x] Updated grid card variant:
  - Removed `border-b-2 border-black` from image container
  - Replaced `bg-concrete-gray` placeholder with `bg-secondary`
  - Changed `font-display` to `font-sans` for title
  - Changed `text-concrete-gray` to `text-muted-foreground`
  - Changed price to `font-mono font-semibold text-green-gain`
  - Replaced `bg-signal-red` progress bar fill with `bg-green-gain`
  - Changed discount text to `font-mono font-semibold text-green-gain`
  - Removed `border-2 border-black` from progress bar container

Files: `src/features/deals/dealCard.tsx`

---

## T11. Restyle Deal Detail page

- Dependencies: T1, T2, T5

- [x] Updated `src/routes/deals/$id.tsx`:
  - Replaced `border-2 border-black bg-white` container with `bg-card border border-border rounded-sm`
  - Replaced `border-b-2 border-black md:border-r-2` image divider with `border-b border-border md:border-r`
  - Replaced `bg-concrete-gray` image placeholder with `bg-secondary`
  - Title: changed `font-display` to `font-sans`, removed `uppercase tracking-wide`
  - Store text: changed to `text-muted-foreground`
  - Price: changed to `font-mono font-semibold text-green-gain text-3xl`
  - Original price: changed to `font-mono text-muted-foreground line-through`
  - Discount bar: replaced `border-2 border-black bg-muted` with `bg-secondary rounded-sm`, changed fill from `bg-signal-red` to `bg-green-gain`
  - Discount text: changed to `font-mono font-semibold text-green-gain`
  - Back link: added `text-muted-foreground hover:text-foreground transition-colors`
- [x] Updated skeleton: replaced `bg-muted border-2 border-black` blocks with `bg-secondary rounded-sm`
- [x] Widened container from `max-w-[1280px]` to `max-w-[1400px]`

Files: `src/routes/deals/$id.tsx`

---

## T12. Restyle PriceHistoryChart for dark theme

- Dependencies: T1, T2

- [x] Updated `src/features/deals/priceHistoryChart.tsx`:
  - Outer container: replaced `border-2 border-black bg-white` with `bg-card border border-border rounded-sm`
  - Header divider: replaced `border-b-2 border-black` with `border-b border-border`
  - Chart area: replaced `border-2 border-black bg-white` with `bg-background border border-border rounded-sm`
  - Axis lines: changed `stroke-black` to `stroke-border`
  - Data line: changed `stroke-signal-red` to `stroke-green-gain`
  - Data points: changed `fill-black` to `fill-green-gain`
  - Price labels: changed `text-concrete-gray` to `text-muted-foreground font-mono`
  - Title: changed `font-display` to `font-sans`
  - Empty state text: changed to `text-muted-foreground`

Files: `src/features/deals/priceHistoryChart.tsx`

---

## T13. Update index route container width

- Dependencies: none

- [x] In `src/routes/index.tsx`: changed `max-w-[1280px]` to `max-w-[1400px]`

Files: `src/routes/index.tsx`

---

## T14. Restyle Admin layout

- Dependencies: T1, T2, T5

- [x] Updated `src/routes/admin.tsx`:
  - Header: changed `bg-white border-b-3 border-black` to `bg-card border-b border-border`, height from `h-14` to `h-12`
  - Brand text: updated to terminal treatment — "DEALS" in `text-muted-foreground` + "RADAR" in `text-green-gain`, `font-mono`
  - Nav buttons: using dark theme compatible variants
  - Sign-out button: changed to `variant="ghost"` with `text-muted-foreground hover:text-foreground`
  - Container: widened from `max-w-[1280px]` to `max-w-[1400px]`
  - Unauthorized page: changed `font-display` to `font-sans`

Files: `src/routes/admin.tsx`

---

## T15. Restyle Admin Sources page + SourcesList

- Dependencies: T1, T2, T5, T8

- [x] Updated `src/routes/admin/sources.tsx`:
  - Heading: changed `font-display` to `font-sans`
- [x] Updated `src/features/admin/sourcesList.tsx`:
  - Removed `bg-white` from cards (now use default Card styling)
  - Dropdown menu: replaced `bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` with `bg-popover border border-border rounded-sm shadow-md`
  - Error state: replaced `bg-error-bg border-2 border-black` with `bg-red-loss-muted border-l-2 border-red-loss rounded-sm`
  - Store name: changed `font-display` to `font-sans`

Files: `src/routes/admin/sources.tsx`, `src/features/admin/sourcesList.tsx`

---

## T16. Restyle Admin CrawlJobsPanel

- Dependencies: T1, T2, T5, T8

- [x] Updated `src/features/admin/crawlJobsPanel.tsx`:
  - Removed `bg-white` from Card
  - Job items: replaced `border border-black bg-white` with `bg-secondary border border-border rounded-sm`

Files: `src/features/admin/crawlJobsPanel.tsx`

---

## T17. Final pass — search and destroy hardcoded colors

- Dependencies: T1-T16

- [x] Grep'd entire `src/` directory for remaining hardcoded colors:
  - All `bg-white` instances replaced with `bg-card` or `bg-background`
  - All `text-black` instances replaced with `text-foreground`
  - All `border-black` instances replaced with `border-border` or `border-input`
  - All `font-display` instances replaced with `font-sans` (headings) or `font-mono` (data)
  - All `text-concrete-gray` instances replaced with `text-muted-foreground`
  - All `bg-signal-red` / `text-signal-red` instances replaced with `bg-green-gain` / `text-green-gain`
  - `bg-error-bg` replaced with `bg-red-loss-muted`
  - `stroke-black` / `fill-black` in charts replaced with theme tokens

Files: all `src/**/*.tsx`

---

## T18. Verify build + visual check

- Dependencies: T1-T17

- [x] `pnpm typecheck` passes
- [x] `pnpm build` succeeds
- [ ] `pnpm dev` — visually verify (pending manual verification)

Files: none (verification only)"DEALS" muted + "RADAR" green, `font-mono`

- Nav buttons: dark theme compatible variants
- Sign-out button: `variant="ghost"` with muted text
- Container: widen to `max-w-[1400px]`

Files: `src/routes/admin.tsx`

---

## T15. Restyle Admin Sources page + SourcesList

- Dependencies: T1, T2, T5, T8

- [x] Update `src/routes/admin/sources.tsx`:
  - Heading: `font-sans font-bold` (not `font-display`), remove explicit uppercase if using CSS
- [x] Update `src/features/admin/sourcesList.tsx`:
  - Remove all `bg-white`, `border-2 border-black` from cards
  - Use `bg-card border border-border rounded-sm` for source cards
  - Dropdown menu: remove `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` and `bg-white border-2 border-black`; use shadcn `DropdownMenu` component (or update inline styles to use tokens)
  - Error state: replace `bg-error-bg border-2 border-black` with `bg-red-loss-muted border-l-2 border-red-loss`
  - Status badges: Idle (`text-muted-foreground`), Crawling (`text-accent-amber`), Error (`text-red-loss`)
  - Skeleton: dark surface blocks, no borders
- [x] Added `warning` variant to Badge component for Crawling/Running states with amber colors

Files: `src/routes/admin/sources.tsx`, `src/features/admin/sourcesList.tsx`, `src/components/ui/badge.tsx`

---

## T16. Restyle Admin Source Modal + Form + CrawlJobsPanel

- Dependencies: T1, T2, T5, T8

- [x] `sourceModal.tsx`: AlertDialog will pick up dark tokens from T8; verify max-w and layout
- [x] `sourceForm.tsx`: inputs inherit from shadcn Input (T8); verify labels use `text-muted-foreground`; robots preview textarea uses `font-mono` (already does)
- [x] `crawlJobsPanel.tsx`:
  - Replace `border border-black bg-white` on job items with `bg-secondary border border-border rounded-sm`
  - Replace `bg-white` on Card with nothing (Card inherits `bg-card` from T6)
  - Status colors: success = `text-green-gain`, failed = `text-red-loss`
  - Timestamps/data: ensure `font-mono`

Files: `src/features/admin/sourceModal.tsx`, `src/features/admin/sourceForm.tsx`, `src/features/admin/crawlJobsPanel.tsx`

---

## T17. Final pass — search and destroy hardcoded colors

- Dependencies: T1-T16

Grep the entire `src/` directory for any remaining:

- [x] `bg-white` — replace with `bg-card` or `bg-background`
- [x] `text-black` — replace with `text-foreground`
- [x] `border-black` — replace with `border-border` or `border-input`
- [x] `bg-black` — replace with `bg-foreground` or appropriate dark equivalent
- [x] `stroke-black` / `fill-black` — replace with token-based classes
- [x] `#000000` / `rgba(0,0,0` — replace with CSS variable references
- [x] `safety-yellow` — replace with `green-gain` or remove
- [x] `signal-red` — replace with `red-loss` or `green-gain` (discounts are gains)
- [x] `concrete-gray` — replace with `muted-foreground`
- [x] `font-display` — replace with `font-sans` (headings) or `font-mono` (data)
- [x] Replaced `bg-black/10` in alert-dialog.tsx with `bg-background/50`

Files: all `src/**/*.tsx`, `src/styles.css`

---

## T18. Verify build + visual check

- Dependencies: T1-T17

- [x] `pnpm typecheck` passes
- [x] `pnpm build` succeeds
- [ ] `pnpm dev` — visually verify:
  - Dark background everywhere
  - Green prices, red for errors only
  - Monospace numbers
  - Table view as default on deals feed
  - Header with terminal branding
  - Admin pages styled consistently
  - No white flashes or broken layouts
  - Focus rings visible and blue

Files: none (verification only)
