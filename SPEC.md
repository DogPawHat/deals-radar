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

### Aesthetic: Supermarket Brutalist

Utilitarian, bold, unpretentious. Embrace the raw aesthetic of warehouse stores and discount bins. No-frills design that feels honest and direct-like walking into a Costco or reading a shelf label.

### Typography

- **Display/Headlines:** Archivo Black - heavy industrial weight for prices and headings
- **Body:** Work Sans - utilitarian, readable, no-nonsense
- **Prices/Data:** Tabular figures, bold weights, oversized when emphasizing discounts

### Color Palette

| Role             | Color         | Hex       |
| ---------------- | ------------- | --------- |
| Background       | Stark White   | `#FFFFFF` |
| Text             | Black         | `#000000` |
| Primary Accent   | Safety Yellow | `#FFE500` |
| Discount/Sale    | Signal Red    | `#FF0000` |
| Muted/Secondary  | Concrete Gray | `#6B6B6B` |
| Borders          | Black         | `#000000` |
| Success          | Green         | `#00A651` |
| Error Background | Light Red     | `#FFE5E5` |

### Visual Language

- **Flat design** - no gradients, no soft shadows
- **Thick black borders** (2-3px) on cards and interactive elements
- **High contrast** - black on white, yellow highlights, red callouts
- **Warehouse striping** - diagonal caution stripes as accent patterns
- **Shelf label styling** - price tags resemble actual retail labels
- **Stencil aesthetic** - discount percentages in bold, industrial type
- **Barcode motifs** - subtle barcode patterns as decorative elements

### Motion Philosophy

- **Minimal and snappy** - efficiency over flair
- No elaborate animations or transitions
- State changes are instant or near-instant (≤100ms)
- Hover states: background color swap, no transform effects
- Loading: simple skeleton blocks, no pulse (static gray placeholders)

### Spacing & Layout

- **Dense but organized** - tight gutters, efficient use of space
- **Grid-aligned** - everything snaps to a visible structure
- **Generous padding inside cards** — content breathes within containers
- **Tight margins between cards** — warehouse shelf efficiency

### Distinctive Elements

1. **Price tags** look like actual shelf labels with optional barcode styling
2. **Discount percentages** displayed in oversized stencil-style type
3. **Yellow highlight strips** behind key information (like highlighter on a receipt)
4. **"SALE" stamps** — rotated red badges, not rounded pills
5. **Section dividers** use warehouse caution striping pattern

### What to Avoid

- Rounded corners beyond 4px (keep it boxy)
- Gradient backgrounds
- Soft drop shadows
- Playful illustrations or icons
- Decorative animations
- Pastel colors
- Thin, delicate typography

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

- **Header**: Logo/title on left (bold uppercase, Archivo Black), admin link on right (if authenticated)
- **Header style**: White background, thick black bottom border (3px)
- **Main content**: Full-width with max-width container (~1280px)
- **No footer** (minimal chrome)

### Buttons

- **Primary**: Black background, white uppercase text, no rounded corners
- **Secondary**: White background, black border (2px), black uppercase text
- **Hover**: Colors invert (primary → white bg/black text, secondary → black bg/white text)
- **Disabled**: Gray background (#6B6B6B), no hover effect

### Public: Deals Feed (`/`)

#### Filter Tabs

- Horizontal tab bar below header
- Active tab: yellow background, black text, thick black border
- Inactive tabs: white background, black text, thin black border
- Tabs: NEWEST | BIGGEST DROP | PRICE | ALL (uppercase)

#### View Toggle

- Icon buttons for grid/list view (top-right of content area)
- Persisted to localStorage
- Default: grid

#### Deal Card (Grid View)

```
┌─────────────────────────┐
│      [Image/Placeholder]│  240×160 aspect
├─────────────────────────┤
│ Product Title (2 lines) │  truncate with ellipsis
│ Store Name              │  muted text
├─────────────────────────┤
│ $XX.XX    $YY.YY        │  current (bold) / original (strikethrough)
│ ██████░░░░ 25% off      │  progress bar + badge
└─────────────────────────┘
```

- Grid: 4 cols desktop, 3 tablet, 2 mobile, 1 small mobile
- Hover: yellow background fill, thick black border
- Click: navigates to detail page
- Cards have 2px black borders, no rounded corners

#### Deal Row (List View)

```
┌────────┬────────────────────────────────────────┬──────────┐
│ [Img]  │ Title                     Store        │ $XX  25% │
│ 80×80  │ (single line, truncate)   (muted)      │ off      │
└────────┴────────────────────────────────────────┴──────────┘
```

#### Pagination / Infinite Scroll

- Infinite scroll with "Load more" button fallback
- Show skeleton cards while loading

### Public: Deal Detail (`/deals/:id`)

```
┌─────────────────────────────────────────────────┐
│ ← Back to deals                                 │
├───────────────────────┬─────────────────────────┤
│                       │ Product Title           │
│   [Large Image]       │ Store: StoreName        │
│   400×300             │                         │
│                       │ $XX.XX  (was $YY.YY)    │
│                       │ ████████░░ 25% off      │
│                       │                         │
│                       │ [View Deal →] button    │
├───────────────────────┴─────────────────────────┤
│           Price History (30 days)               │
│   $50 ─┐                                        │
│        └────────┐                               │
│   $30           └─────────────────              │
│        |    |    |    |    |    |               │
│       1/1  1/5  1/10 1/15 1/20 1/25             │
└─────────────────────────────────────────────────┘
```

- "View Deal" opens external URL in new tab
- Chart: line chart with price on Y, date on X
- Mobile: stack image above details

### Admin: Sources (`/admin/sources`)

#### Source List

```
┌──────────────────────────────────────────────────────────────┐
│ Sources                                    [+ Add Source]    │
├──────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ StoreName.com                              ● Idle        │ │
│ │ https://store.com/deals                                  │ │
│ │ Last crawl: 2h ago • 42 deals              [Run Now] [⋮] │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ AnotherStore                               ◐ Crawling... │ │
│ │ ...                                                      │ │
└──────────────────────────────────────────────────────────────┘
```

- Status indicators: Idle (gray dot), Crawling (yellow dot + "CRAWLING" text), Error (red dot)
- "Run Now" disabled during cooldown (tooltip shows remaining time)
- Overflow menu (⋮): Edit, View Robots Rules, Delete

#### Add/Edit Source Modal

```
┌─────────────────────────────────────┐
│ Add Source                      [×] │
├─────────────────────────────────────┤
│ Name                                │
│ [________________________]          │
│                                     │
│ URL                                 │
│ [________________________]          │
│                                     │
│ Crawl Interval                      │
│ [Every 6 hours          ▼]          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Robots.txt Rules                │ │
│ │ ✓ Allow: /deals/*               │ │
│ │ ✗ Disallow: /admin/*            │ │
│ └─────────────────────────────────┘ │
│                                     │
│        [Cancel]  [Save Source]      │
└─────────────────────────────────────┘
```

- Robots rules fetched on URL blur, shown inline
- Validation: URL must be valid, name required

#### Crawl Jobs Panel (expandable per source)

```
┌─────────────────────────────────────────────────────────┐
│ Recent Crawls                                           │
├─────────────────────────────────────────────────────────┤
│ ✓ Jan 15, 2:30 PM    42 deals    1.2s                   │
│ ✓ Jan 15, 8:30 AM    41 deals    1.4s                   │
│ ✗ Jan 14, 2:30 PM    Failed: Connection timeout  [Copy] │
│   └─ Attempt 1/3                                        │
└─────────────────────────────────────────────────────────┘
```

- Expandable section under each source
- Failed jobs show error message with copy button
- Shows attempt number for retried jobs

### States

#### Loading

- Skeleton placeholders matching content shape
- Static gray blocks (no pulse animation)
- Black border outlines on skeleton cards

#### Empty States

- **No deals**: "NO DEALS FOUND" — bold uppercase text, no illustration
- **No sources**: "ADD YOUR FIRST SOURCE" — bold uppercase with arrow pointing to button
- **No price history**: "TRACKING STARTED" (single point on chart)

#### Error States

- Inline error banner: red background (#FFE5E5), black border, black text
- [RETRY] button in uppercase with black background

### Responsive Breakpoints

| Breakpoint | Width  | Grid Cols | Layout Changes              |
| ---------- | ------ | --------- | --------------------------- |
| sm         | 640px  | 1         | Stack everything            |
| md         | 768px  | 2         | Side-by-side on detail page |
| lg         | 1024px | 3         | Standard tablet             |
| xl         | 1280px | 4         | Full desktop                |

### Accessibility

- All interactive elements keyboard accessible
- Focus: thick black outline (3px), no box-shadow
- Semantic heading hierarchy (h1 → h2 → h3)
- Alt text for deal images
- ARIA labels on icon-only buttons
