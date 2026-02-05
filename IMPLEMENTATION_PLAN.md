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
- [ ] On `<body>`: no changes needed (already uses `bg-background text-foreground` via base layer)

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

- [ ] `dropdown-menu.tsx`: remove hardcoded `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` if present in sourcesList; ensure `bg-popover text-popover-foreground` (should work with new tokens); update focus item color from `bg-accent` (was safety-yellow) to new accent
- [ ] `combobox.tsx`: same accent color fix
- [ ] `select.tsx`: same accent color fix
- [ ] `input.tsx`: ensure `border-input` picks up new dark border token; no hardcoded colors
- [ ] `textarea.tsx`: same as input
- [ ] `alert-dialog.tsx`: ensure dark surface and ring colors
- [ ] `separator.tsx`: should work automatically via `bg-border` token

Files: `src/components/ui/dropdown-menu.tsx`, `src/components/ui/combobox.tsx`, `src/components/ui/select.tsx`, `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`, `src/components/ui/alert-dialog.tsx`

---

## T9. Restyle DealsFeed — tabs, view toggle, skeletons, error/empty states

- Dependencies: T2, T5, T7

- [ ] Update `src/features/deals/dealsFeed.tsx`:
  - Default view: change from `"grid"` to `"table"` in localStorage default
  - Tab bar: remove `border-b-3 border-black`; use `border-b border-border`; tabs use line variant with green underline per T7
  - Tab triggers: remove `data-[active]:bg-safety-yellow data-[active]:border-b-3 data-[active]:border-black`; let the Tabs component handle active styling
  - View toggle icons: swap Grid3X3/List for Table/Grid icons; update button variants for dark theme
  - Skeleton: replace `bg-white border-2 border-black` with `bg-card` (no border); replace inner `border-b-2 border-black` dividers
  - Error state: replace `bg-error-bg border-2 border-black` with `ErrorBanner` component (or updated inline styles)
  - Empty state: update to `text-muted-foreground` styling
  - Container width: widen from `max-w-[1280px]` to `max-w-[1400px]` (in parent route)

Files: `src/features/deals/dealsFeed.tsx`

---

## T10. Restyle DealCard — grid and list variants + create table row variant

- Dependencies: T1, T2, T9

This is the biggest UI change. The default view becomes a table with sortable rows.

- [ ] In `src/features/deals/dealCard.tsx`, add a `"table"` view variant:
  - Row: 44px height, `bg-card hover:bg-secondary` with `border-b border-border`
  - Thumbnail: 32x32, `rounded-sm`, placeholder if no image
  - Product name: `text-foreground font-sans text-sm`, single line, truncated
  - Store: compact pill `bg-secondary text-muted-foreground text-xs px-2 py-0.5 rounded-sm`
  - Price: `font-mono font-semibold text-green-gain` for current, `font-mono text-muted-foreground line-through` for original
  - Drop %: pill with `text-green-gain bg-green-gain-muted text-xs font-mono px-2 py-0.5 rounded-sm`
  - Hover: `bg-secondary`, optionally left border accent `border-l-2 border-green-gain`
- [ ] Update grid card variant for dark:
  - Remove Card wrapper (or update Card to not use yellow hover)
  - `bg-card hover:bg-secondary rounded-sm` — no border
  - Image smaller, store as pill, price in mono green
  - 5 cols desktop, 4 large, 3 tablet, 2 mobile
- [ ] Update list variant for dark:
  - Replace `border border-black` and `bg-concrete-gray` placeholders
  - Replace `bg-signal-red text-white rotate-[-5deg]` discount stamp with green pill
- [ ] Remove all `font-display` references — use `font-sans` for titles, `font-mono` for data
- [ ] Replace `text-concrete-gray` with `text-muted-foreground`
- [ ] Replace `bg-signal-red` / `text-signal-red` with `bg-green-gain-muted` / `text-green-gain`
- [ ] Update `dealsFeed.tsx` to render table header row when `view === "table"`
- [ ] Wire up sortable column headers (optional — can defer to a separate task)

Files: `src/features/deals/dealCard.tsx`, `src/features/deals/dealsFeed.tsx`

---

## T11. Restyle Deal Detail page

- Dependencies: T1, T2, T5

- [ ] Update `src/routes/deals/$id.tsx`:
  - Replace `border-2 border-black bg-white` container with `bg-card border border-border rounded-sm`
  - Replace `border-b-2 border-black md:border-r-2` image divider with `border-b border-border md:border-r`
  - Replace `bg-concrete-gray` image placeholder with `bg-secondary`
  - Title: `font-sans font-bold` (not `font-display`), remove `uppercase tracking-wide`
  - Store text: `text-muted-foreground`
  - Price: `font-mono font-bold text-green-gain text-3xl`
  - Original price: `font-mono text-muted-foreground line-through`
  - Discount bar: replace `border-2 border-black bg-muted` + `bg-signal-red` fill with `bg-secondary rounded-sm` + `bg-green-gain` fill
  - Discount text: `text-green-gain font-mono` instead of `text-signal-red font-display`
  - Add savings amount: "You save $117.00" text
  - "View Deal" button: `variant="default"` (now accent-blue)
  - Back link: simpler styling, `text-muted-foreground hover:text-foreground`
- [ ] Update skeleton: replace `bg-muted border-2 border-black` blocks with `bg-card` blocks (no borders)
- [ ] Widen container to `max-w-[1400px]`

Files: `src/routes/deals/$id.tsx`

---

## T12. Restyle PriceHistoryChart for dark theme

- Dependencies: T1, T2

- [ ] Update `src/features/deals/priceHistoryChart.tsx`:
  - Outer container: replace `border-2 border-black bg-white` with `bg-card border border-border rounded-sm`
  - Header divider: replace `border-b-2 border-black` with `border-b border-border`
  - Chart area: replace `border-2 border-black bg-white` with `bg-background` (darkest surface)
  - Axis lines: `stroke-border` (subtle) instead of `stroke-black`
  - Data line: `stroke-green-gain` instead of `stroke-signal-red`
  - Data points: `fill-green-gain` instead of `fill-black`
  - Price labels: `text-muted-foreground` instead of `text-concrete-gray`
  - Title: remove `font-display`, use `font-sans font-bold uppercase tracking-wide`
  - Add price stats row below chart: min/max/avg in `font-mono text-muted-foreground`

Files: `src/features/deals/priceHistoryChart.tsx`

---

## T13. Update index route container width

- Dependencies: none

- [ ] In `src/routes/index.tsx`: change `max-w-[1280px]` to `max-w-[1400px]`

Files: `src/routes/index.tsx`

---

## T14. Restyle Admin layout

- Dependencies: T1, T2, T5

- [ ] Update `src/routes/admin.tsx`:
  - Header: `bg-card border-b border-border` (replace `bg-white border-b-3 border-black`)
  - Brand text: same terminal treatment as main Header — "DEALS" muted + "RADAR" green, `font-mono`
  - Nav buttons: dark theme compatible variants
  - Sign-out button: `variant="ghost"` with muted text
  - Container: widen to `max-w-[1400px]`

Files: `src/routes/admin.tsx`

---

## T15. Restyle Admin Sources page + SourcesList

- Dependencies: T1, T2, T5, T8

- [ ] Update `src/routes/admin/sources.tsx`:
  - Heading: `font-sans font-bold` (not `font-display`), remove explicit uppercase if using CSS
- [ ] Update `src/features/admin/sourcesList.tsx`:
  - Remove all `bg-white`, `border-2 border-black` from cards
  - Use `bg-card border border-border rounded-sm` for source cards
  - Dropdown menu: remove `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` and `bg-white border-2 border-black`; use shadcn `DropdownMenu` component (or update inline styles to use tokens)
  - Error state: replace `bg-error-bg border-2 border-black` with `bg-red-loss-muted border-l-2 border-red-loss`
  - Status badges: Idle (`text-muted-foreground`), Crawling (`text-accent-amber`), Error (`text-red-loss`)
  - Skeleton: dark surface blocks, no borders

Files: `src/routes/admin/sources.tsx`, `src/features/admin/sourcesList.tsx`

---

## T16. Restyle Admin Source Modal + Form + CrawlJobsPanel

- Dependencies: T1, T2, T5, T8

- [ ] `sourceModal.tsx`: AlertDialog will pick up dark tokens from T8; verify max-w and layout
- [ ] `sourceForm.tsx`: inputs inherit from shadcn Input (T8); verify labels use `text-muted-foreground`; robots preview textarea uses `font-mono` (already does)
- [ ] `crawlJobsPanel.tsx`:
  - Replace `border border-black bg-white` on job items with `bg-secondary border border-border rounded-sm`
  - Replace `bg-white` on Card with nothing (Card inherits `bg-card` from T6)
  - Status colors: success = `text-green-gain`, failed = `text-red-loss`
  - Timestamps/data: ensure `font-mono`

Files: `src/features/admin/sourceModal.tsx`, `src/features/admin/sourceForm.tsx`, `src/features/admin/crawlJobsPanel.tsx`

---

## T17. Final pass — search and destroy hardcoded colors

- Dependencies: T1-T16

Grep the entire `src/` directory for any remaining:

- [ ] `bg-white` — replace with `bg-card` or `bg-background`
- [ ] `text-black` — replace with `text-foreground`
- [ ] `border-black` — replace with `border-border` or `border-input`
- [ ] `bg-black` — replace with `bg-foreground` or appropriate dark equivalent
- [ ] `stroke-black` / `fill-black` — replace with token-based classes
- [ ] `#000000` / `rgba(0,0,0` — replace with CSS variable references
- [ ] `safety-yellow` — replace with `green-gain` or remove
- [ ] `signal-red` — replace with `red-loss` or `green-gain` (discounts are gains)
- [ ] `concrete-gray` — replace with `muted-foreground`
- [ ] `font-display` — replace with `font-sans` (headings) or `font-mono` (data)

Files: all `src/**/*.tsx`, `src/styles.css`

---

## T18. Verify build + visual check

- Dependencies: T1-T17

- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` succeeds
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
