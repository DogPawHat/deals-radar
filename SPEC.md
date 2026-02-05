# Deals Radar

A website that shows the latest deals from a set of websites.

---

## Features

### Public

- Browse deals in a grid/list view with price + % off
- Filter by tabs: **Newest | Biggest drop | Price | All**
- Click a deal → detail page with price history chart
- Image or placeholder for each deal
- Only shows deals with ≥5% discount

### Admin

- Protected via login
- `/admin/sources` - manage deal sources:
  - List all sources
  - Add/Edit source
  - View robots.txt rules
  - Dry-run crawl preview (no DB write)
  - Manual **Run Now** (3-min cooldown)
  - Show crawl jobs & error logs
  - Copy raw error details

---

## Functional Requirements

### Crawl Pipeline

1. Cron (`crawlTick`) checks due sources
2. Enqueues crawlJobs
3. Queue limits:
   - Max concurrent: 3
   - Max 10 jobs/min
   - Retries: 3 (1m, 4m, 10m backoff)
4. `runFirecrawl` action:
   - Fetch with schema
   - If robots-blocked → mark and stop
   - Parse items
   - Write deals + price history
5. UI updates live via Convex subscriptions

### Robots Handling

- Fetch robots.txt on source save
- Parse and store allow/disallow rules
- Show rules in Admin only

### Filtering & Display

- Hide deals < 5% off
- Tabs:
  - **Newest** - `lastSeenAt DESC`
  - **Biggest drop** - `percentOff DESC`
  - **Price** - `currentPrice ASC`
  - **All**

### Deduplication

```
key = hash(canonicalUrl + title)
```

### Constraints

- Always respect robots.txt
- Amazon excluded due to ToS restrictions
- No scraping sites without permission

---

## Data Model

Schemas defined using Effect Schema via Confect (`convex/schema.ts`).

```ts
// deals
deals: defineTable(
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
)
  .index("by_storeId", ["storeId"])
  .index("by_dedupeKey_for_store", ["dedupKey", "storeId"]);

// stores
stores: defineTable(
  Schema.Struct({
    name: Schema.String,
    url: Schema.String,
    lastCrawlAt: Schema.optional(Schema.Number),
    isCrawling: Schema.Boolean,
  }),
);

// priceHistory
priceHistory: defineTable(
  Schema.Struct({
    dealId: Id.Id("deals"),
    price: Schema.Number,
    at: Schema.Number,
  }),
).index("by_dealId", ["dealId"]);

// crawlJobs
crawlJobs: defineTable(
  Schema.Struct({
    storeId: Id.Id("stores"),
    enqueuedAt: Schema.Number,
    startedAt: Schema.optional(Schema.Number),
    finishedAt: Schema.optional(Schema.Number),
    status: Schema.Literal("queued", "running", "done", "failed"),
    resultCount: Schema.optional(Schema.Number),
    blockedByRobots: Schema.optional(Schema.Boolean),
    blockedRule: Schema.optional(Schema.String),
    errorDetails: Schema.optional(Schema.String),
    attempt: Schema.Number,
  }),
).index("by_storeId", ["storeId"]);
```

---

## Tech Stack

- **Frontend:** TanStack Start (React 19, SSR)
- **Backend:** Convex (serverless DB + functions) via [Confect](https://github.com/rjdellecese/confect)
- **Schema/Validation:** Effect Schema (used by Confect for DB schemas and function validators)
- **Crawling:** Firecrawl
- **Auth:** Clerk (admin only)
- **Hosting:** Netlify

### Confect

[Confect](https://rjdellecese.gitbook.io/confect) integrates Effect with Convex:

- Define Convex schemas using Effect schemas
- Automatic encode/decode when reading/writing to DB
- Effect-ified Convex APIs (Promises → Effects, `A | null` → `Option<A>`)

### Firecrawl Schema Example

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "url": { "type": "string" },
          "price": { "type": "number" },
          "currency": { "type": "string" },
          "msrp": { "type": "number" },
          "image": { "type": "string" }
        },
        "required": ["title", "url", "price", "currency"]
      }
    }
  },
  "required": ["items"]
}
```

### Deployment

- Netlify build + deploy
- Convex project + environment variables
- Clerk project configured in dashboard
- No seeding - sources are admin-added only

---

## Out of Scope

- Public source submission
- Affiliate links
- Notifications
- FX conversion
- Data cleanup cron
- Multi-role permissions
- Full mobile polish (just responsive enough)
- Bulk-delete sources

---

## Design Direction

### Aesthetic: Dark Data Terminal

A dark, information-dense deal monitoring dashboard. Think Bloomberg Terminal meets a modern fintech app. Every pixel earns its place by conveying data. The interface should feel like a serious deal-hunting tool — functional, fast, and uncluttered.

### Typography

- **UI text/labels/headlines:** Geist Sans — clean, tight, highly legible at small sizes. Headlines use weight 700, uppercase, letter-spaced (terminal section labels)
- **Data/numbers/prices:** JetBrains Mono — monospace for prices, percentages, timestamps. All numerical data feels like live financial data
- **Body text:** Geist Sans — weight 400-500 for descriptions and secondary content

### Color Palette

| Role                 | Token                | Value       |
| -------------------- | -------------------- | ----------- |
| Background           | `--bg-primary`       | `#0A0A0B`   |
| Surface              | `--bg-surface`       | `#141416`   |
| Surface hover        | `--bg-surface-hover` | `#1C1C1F`   |
| Border subtle        | `--border-subtle`    | `#222225`   |
| Border active        | `--border-active`    | `#333338`   |
| Text primary         | `--text-primary`     | `#E8E8ED`   |
| Text secondary       | `--text-secondary`   | `#6E6E7A`   |
| Text tertiary        | `--text-tertiary`    | `#46464F`   |
| Price drop / savings | `--green-gain`       | `#00FF88`   |
| Green muted bg       | `--green-gain-muted` | `#00FF8820` |
| Price increase       | `--red-loss`         | `#FF4444`   |
| Red muted bg         | `--red-loss-muted`   | `#FF444420` |
| Interactive/links    | `--accent-blue`      | `#3B82F6`   |
| Warning              | `--accent-amber`     | `#F59E0B`   |

### Visual Language

- **Dark-first** — `#0A0A0B` background, surfaces differentiated by subtle lightness shifts
- **No visible borders by default** — rely on background contrast between `--bg-surface` and `--bg-primary`; use `1px --border-subtle` only when needed for grouping
- **Data hierarchy via typography** — weight, size, and color (not borders or boxes) create visual structure
- **Monospace for all numbers** — prices, percentages, timestamps, counts all render in JetBrains Mono
- **Colored signals** — green for savings/drops, red for increases/errors, amber for warnings, blue for links/actions
- **Muted background pills** — discount badges use colored text on translucent colored background (e.g. `--green-gain` text on `--green-gain-muted` bg)
- **Inline sparklines** — mini 30px-wide SVG charts showing price trend next to deal rows
- **Max border-radius: 4px** — keep everything tight and functional

### Motion Philosophy

- **Minimal and functional** — quick transitions, no decorative animation
- Row hover: 150ms background color fade
- Tab switch: 200ms content crossfade
- Page load: staggered row fade-in (50ms delay between rows, max 300ms total)
- Number changes: counter animation on price updates if real-time
- No bouncing, no spring physics, no elaborate entrance animations

### Spacing & Layout

- **Dense and efficient** — information density is a feature, not a bug
- **Slim rows** — 40-48px row height in table view
- **Tight gutters** — 8-12px gaps between elements
- **Full-width utilization** — max-width container (~1400px) to show more columns
- **Alignment precision** — numbers right-aligned, text left-aligned, columns snap to grid

### Distinctive Elements

1. **Table-first design** — default view is sortable data rows, not cards
2. **Small thumbnails** (32×32) inline with data rows — product identification without visual noise
3. **Monospace price display** — `$248.00` in green bold mono, ~~$365.00~~ in muted strikethrough
4. **Percentage pills** — `-32%` in green text on translucent green background
5. **Sparkline price trends** — tiny inline SVG charts showing 30-day direction
6. **Terminal-style header** — "DEALS" in muted text, "RADAR" in `--green-gain`, monospace
7. **Column-sortable tables** — click column headers to sort, active sort indicated by arrow + highlight

### What to Avoid

- Bright backgrounds or light themes
- Thick borders (>1px)
- Border radius >4px
- Large images or image-forward layouts
- Decorative elements that don't convey data
- Playful typography or rounded friendly fonts
- Gradient backgrounds
- Heavy box shadows
- Animations longer than 300ms

---

## User Interface

### Routes

| Path             | Description                             |
| ---------------- | --------------------------------------- |
| `/`              | Public deals feed (default: Newest tab) |
| `/deals/:id`     | Deal detail with price history          |
| `/admin`         | Redirects to `/admin/sources`           |
| `/admin/sources` | Source management (protected)           |

### Layout

- **Header**: Slim 48px bar, dark background (`--bg-surface`), subtle bottom border (`1px --border-subtle`). "DEALS" in `--text-secondary`, "RADAR" in `--green-gain`, monospace. Admin link on right (if authenticated)
- **Main content**: Full-width with max-width container (~1400px), wider than typical to accommodate table columns
- **No footer** (minimal chrome)

### Buttons

- **Primary**: `--accent-blue` background, white text, 4px radius
- **Secondary**: Transparent background, `--border-active` border (1px), `--text-primary` text
- **Ghost**: No border/background, `--text-secondary` text, hover shows `--bg-surface-hover`
- **Destructive**: `--red-loss` background, white text
- **Hover**: Subtle lightening of background (no color inversion)
- **Disabled**: `--text-tertiary` text, `--bg-surface` background, reduced opacity

### Public: Deals Feed (`/`)

#### Filter Tabs

- Minimal tab bar below header
- Active tab: `--text-primary` text with `--green-gain` underline (2px)
- Inactive tabs: `--text-secondary` text, no underline
- Tabs: NEWEST | BIGGEST DROP | PRICE | ALL (uppercase, letter-spaced, Geist Sans 600)
- No background fills on tabs — pure text + underline treatment

#### View Toggle

- Icon buttons for table/card view (top-right of tab bar)
- Persisted to localStorage
- Default: **table** (not grid)

#### Deal Table Row (Default View)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  IMG │ Product Name           │ Store │ Price    │ Was      │ Drop  │ ▁▃▅ │
│  --- │ ---------------------- │ ----- │ -------- │ -------- │ ----- │ --- │
│  [·] │ Sony WH-1000XM5       │ AMZ   │ $248.00  │ $365.00  │ -32%  │ ▁▃▅ │
│  [·] │ MacBook Air M3         │ BH    │ $899.00  │ $1099.00 │ -18%  │ ▅▃▁ │
│  [·] │ Dyson V15 Detect      │ TGT   │ $449.00  │ $599.00  │ -25%  │ ▃▁▁ │
└───────────────────────────────────────────────────────────────────────────┘
```

- Row height: 44px
- Small 32×32 thumbnail (4px radius), placeholder if no image
- Product name in `--text-primary` (Geist Sans 400), single line, truncated
- Store as compact pill badge in `--text-secondary` on `--bg-surface-hover` bg
- Current price in `--green-gain` JetBrains Mono 600
- Original price in `--text-tertiary` JetBrains Mono 400, strikethrough
- Drop percentage as pill: `--green-gain` text on `--green-gain-muted` background
- Mini sparkline (30px wide) showing 30-day price trend
- Hover: row bg shifts to `--bg-surface-hover`, subtle left border accent in `--green-gain`
- Click: navigates to detail page
- Column headers sortable — click to sort, active sort shows arrow + `--text-primary`

#### Deal Card (Grid View — Compact)

```
┌─────────────────────────┐
│  [Thumbnail]            │  Small image, aspect-ratio constrained
│  Product Title (2 lines)│  Geist Sans 400, 13-14px, 2-line clamp
│  AMZ  · 2h ago          │  Store pill + timestamp in --text-secondary
│  $248   -32%            │  Price in mono green + drop pill
└─────────────────────────┘
```

- No visible borders — cards are `--bg-surface` on `--bg-primary` background
- 4px border-radius
- Hover: bg shifts to `--bg-surface-hover`
- Grid: 5 cols desktop, 4 large tablet, 3 tablet, 2 mobile, 1 small

#### Pagination / Infinite Scroll

- Infinite scroll with "Load more" button fallback
- Show skeleton rows while loading (dark surface rectangles, no pulse — subtle shimmer)

### Public: Deal Detail (`/deals/:id`)

```
┌─────────────────────────────────────────────────────┐
│ ← Back to deals                                     │
├───────────────────────┬─────────────────────────────┤
│                       │ Product Title               │
│   [Image]             │ Store: StoreName  · 2h ago  │
│   300×200             │                             │
│   --bg-surface        │ $248.00   was $365.00       │
│                       │ -32%  · You save $117.00    │
│                       │                             │
│                       │ [View Deal →]               │
├───────────────────────┴─────────────────────────────┤
│           Price History (30 days)                    │
│   $365 ─┐                                           │
│         └────────┐         --green-gain line         │
│   $248           └──────────────────                │
│         |    |    |    |    |    |                   │
│        1/1  1/5  1/10 1/15 1/20 1/25                │
│                                                     │
│  Stats:  Low $240  ·  High $380  ·  Avg $310        │
│          Drops: 3 in 30 days                        │
└─────────────────────────────────────────────────────┘
```

- Price chart: `--green-gain` line on `--bg-surface`, grid lines in `--border-subtle`
- Current price marked with dot, labels in JetBrains Mono
- Price stats row below chart: min/max/avg, number of drops
- "View Deal" opens external URL in new tab
- Mobile: stack image above details

### Admin: Sources (`/admin/sources`)

#### Source List

```
┌──────────────────────────────────────────────────────────────┐
│ SOURCES                                    [+ Add Source]    │
├──────────────────────────────────────────────────────────────┤
│  StoreName.com                               ● Idle          │
│  https://store.com/deals                                     │
│  Last crawl: 2h ago · 42 deals               [Run Now] [⋮]  │
├──────────────────────────────────────────────────────────────┤
│  AnotherStore                                ◐ Crawling...   │
│  https://another.com/sales                                   │
│  Started 30s ago                              [Running] [⋮]  │
└──────────────────────────────────────────────────────────────┘
```

- `--bg-surface` rows on `--bg-primary` background, separated by `--border-subtle`
- Status indicators: Idle (`--text-tertiary` dot), Crawling (`--accent-amber` dot + text), Error (`--red-loss` dot)
- "Run Now" disabled during cooldown (tooltip shows remaining time)
- Overflow menu (⋮): Edit, View Robots Rules, Delete

#### Add/Edit Source Modal

```
┌─────────────────────────────────────┐
│ ADD SOURCE                      [×] │  --bg-surface, 1px --border-subtle
├─────────────────────────────────────┤
│ Name                                │  --text-secondary label
│ [________________________]          │  --bg-primary input, --border-active focus
│                                     │
│ URL                                 │
│ [________________________]          │
│                                     │
│ Crawl Interval                      │
│ [Every 6 hours          ▼]          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ROBOTS.TXT RULES               │ │  --bg-primary inner surface
│ │ ✓ Allow: /deals/*              │ │  --green-gain for allowed
│ │ ✗ Disallow: /admin/*           │ │  --red-loss for blocked
│ └─────────────────────────────────┘ │
│                                     │
│        [Cancel]  [Save Source]      │  Ghost + Primary buttons
└─────────────────────────────────────┘
```

- Robots rules fetched on URL blur, shown inline
- Validation: URL must be valid, name required

#### Crawl Jobs Panel (expandable per source)

```
┌─────────────────────────────────────────────────────────┐
│ RECENT CRAWLS                                           │
├─────────────────────────────────────────────────────────┤
│ ✓ Jan 15, 2:30 PM    42 deals    1.2s                   │  --green-gain
│ ✓ Jan 15, 8:30 AM    41 deals    1.4s                   │  --green-gain
│ ✗ Jan 14, 2:30 PM    Failed: Connection timeout  [Copy] │  --red-loss
│   └─ Attempt 1/3                                        │  --text-tertiary
└─────────────────────────────────────────────────────────┘
```

- Expandable section under each source
- Failed jobs show error message with copy button
- Shows attempt number for retried jobs
- Timestamps and data in JetBrains Mono

### States

#### Loading

- Skeleton placeholders matching content shape
- Dark surface rectangles (`--bg-surface`) with subtle shimmer animation
- No borders on skeletons — just surface contrast

#### Empty States

- **No deals**: "NO DEALS FOUND" — `--text-secondary`, Geist Sans 600, uppercase
- **No sources**: "ADD YOUR FIRST SOURCE" — `--text-secondary` with `--accent-blue` link to action
- **No price history**: "TRACKING STARTED" — single dot on chart, muted message

#### Error States

- Inline error banner: `--red-loss-muted` background, `--red-loss` left border (2px), `--text-primary` text
- [RETRY] button as secondary variant

### Responsive Breakpoints

| Breakpoint | Width  | Table Behavior                              | Layout Changes              |
| ---------- | ------ | ------------------------------------------- | --------------------------- |
| sm         | 640px  | Stack to compact card list                  | Full-width cards            |
| md         | 768px  | Condensed table (hide sparkline, was-price) | Side-by-side on detail page |
| lg         | 1024px | Full table, most columns                    | Standard layout             |
| xl         | 1280px | Full table, all columns + sparklines        | Max-width container         |

### Accessibility

- All interactive elements keyboard accessible
- Focus: 2px `--accent-blue` outline, 2px offset
- Semantic heading hierarchy (h1 → h2 → h3)
- Alt text for deal images
- ARIA labels on icon-only buttons
- Sufficient contrast ratios on dark background (WCAG AA minimum)
- Sort column state announced via aria-sort
