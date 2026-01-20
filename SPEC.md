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
- `/admin/sources` — manage deal sources:
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
- Toast notification if manual run is blocked

### Filtering & Display

- Hide deals < 5% off
- Tabs:
  - **Newest** — `lastSeenAt DESC`
  - **Biggest drop** — `percentOff DESC`
  - **Price** — `currentPrice ASC`
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
  .index("by_dedupeKey_for_store", ["dedupKey", "storeId"])

// stores
stores: defineTable(
  Schema.Struct({
    name: Schema.String,
    url: Schema.String,
    lastCrawlAt: Schema.optional(Schema.Number),
    isCrawling: Schema.Boolean,
  }),
)

// priceHistory
priceHistory: defineTable(
  Schema.Struct({
    dealId: Id.Id("deals"),
    price: Schema.Number,
    at: Schema.Number,
  }),
).index("by_dealId", ["dealId"])

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
).index("by_storeId", ["storeId"])
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
- No seeding — sources are admin-added only

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

## UX Notes

- Disabled "Run Now" button shows time remaining tooltip
- Deal image fallback: neutral placeholder
- Copy error button on crawl failures

---

## Complete When

- [ ] Public deals feed with filtering
- [ ] Admin can add/edit sources
- [ ] Robots check on save
- [ ] Cron + actions working
- [ ] Deals + price history persist
- [ ] Manual run w/ cooldown & toast
- [ ] Respect robots.txt always
- [ ] Placeholder images
