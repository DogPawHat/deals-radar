# 🔥 Deals Radar — Real-Time Deal Tracking Platform

**Tech Stack:** TanStack Start · Convex · Firecrawl · Netlify · Clerk  
**Purpose:** Hackathon build (TanStack/Convex Hackathon)  
**Status:** MVP-first, polished enough for judging, deletable after event

---

## 🎯 Concept

**Deals Radar** automatically discovers and surfaces real-time online shopping deals.  
Admin users define deal sources (e.g. retailer deal pages).  
Convex periodically crawls them (via Firecrawl actions), parses price & product data, and updates a live feed.

The public can browse deals; admins control the sources.

---

## 🧠 Core Features

- 🔍 **Public deals feed** (no auth required)
- ⏱️ **Automated crawlers** (Convex cron + actions)
- 🔧 **Admin portal** to manage unlimited sources
- ⚖️ **Always respect robots.txt**
- 📈 **Price history per product**
- 📉 **Display % off and hide < 5%**
- 🛑 Toast if crawl blocked by robots
- 🗃️ **Convex DB + Realtime UI**
- 🌐 Hosted on **Netlify**
- 🔐 **Clerk** for admin auth

> **Amazon is excluded** from MVP due to ToS — allowed sources only.

---

## 🎨 Product Experience

### Public

- Grid/List of deals with price + % off
- Tabs: **Newest | Biggest drop | Price | All**
- Image or placeholder
- Clicking a deal → detail page w/ price history chart

### Admin

- Clerk login (configured in Clerk dashboard, **out of scope**)
- `/admin/sources`
  - List of all sources
  - Add/Edit source
  - View **robots.txt rules**
  - **Dry-run crawl** preview (no DB write)
  - Manual **Run Now** (3-min cooldown)
  - Show crawl jobs & error logs
  - Copy raw error details

---

## 💾 Data Model

```ts
deals {
  _id: Id<"deals">,
  title: string,
  url: string,
  canonicalUrl: string,
  merchant: string,
  image?: string,
  currentPrice: number,
  currency: string,
  msrp?: number,
  percentOff?: number,
  firstSeenAt: number,
  lastSeenAt: number
}

priceHistory {
  _id: Id<"priceHistory">,
  dealId: Id<"deals">,
  price: number,
  at: number
}

sources {
  _id: Id<"sources">,
  name: string,
  url: string,
  enabled: boolean,
  crawlEveryMins: number,        // default 10
  lastCrawlAt?: number,
  schema: object,                // Firecrawl extraction schema
  robotsTxt?: string,
  robotsCheckedAt?: number,
  robotsMatched?: {
    allow: string[],
    disallow: string[]
  },
  notes?: string
}

crawlJobs {
  _id: Id<"crawlJobs">,
  sourceId: Id<"sources">,
  enqueuedAt: number,
  startedAt?: number,
  finishedAt?: number,
  status: "queued" | "running" | "done" | "failed",
  resultCount?: number,
  blockedByRobots?: boolean,
  blockedRule?: string,
  errorDetails?: string,
  attempt: number
}
```

### Dedup logic

```
key = hash(canonicalUrl + title)
```

---

## 🔁 Crawl Pipeline

### Flow

1. Cron (`crawlTick`) checks due sources
2. Enqueues crawlJobs
3. Queue drain respects limits:
   - max concurrent = **3**
   - max 10 jobs/min
   - retries = **3** (1m, 4m, 10m)

4. `runFirecrawl` action:
   - Fetch Firecrawl with schema
   - If robots-blocked → mark and stop
   - Parse items
   - Write deals + history

5. UI updates live

### Robots Handling

- Always fetch robots.txt on source save
- Parse and store allow/disallow rules
- Show rules in Admin only
- Manual run toast if blocked

---

## 📊 Filtering & Display Rules

- Hide deals < **5%** off
- Tabs:
  - **Newest** — `lastSeenAt DESC`
  - **Biggest drop** — `% off DESC`
  - **Price** — `price ASC`
  - **All**

---

## 📦 Firecrawl Schema Example

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

---

## 🧠 UX Notes

- Disabled “Run Now” button shows time remaining tooltip
- Deal image fallback: neutral placeholder
- Copy error button on crawl failures
- Bulk-delete sources **not needed** (hackathon)

---

## ⚙️ Deployment

- **Netlify** build + deploy
- Convex project + environment variables
- Clerk project configured in dashboard

No seeding — **sources are admin-added only**.

---

## 📄 Legal / ToS

- **Always respect robots.txt**
- Exclude Amazon entirely (MVP)
- No scraping sites without permission

---

## 🧹 What we do _not_ build

- Public source submission
- Affiliate links
- Notifications
- FX conversion
- Data cleanup cron
- Multi-role permissions
- Full mobile polish (just responsive enough)

This is a **hackathon build** — ship fast.

---

## ✅ MVP Complete When

- [ ] Public deals feed with filtering
- [ ] Admin can add/edit sources
- [ ] Robots check on save
- [ ] Convex cron + actions working
- [ ] Deals + price history persist
- [ ] Manual run w/ cooldown & toast
- [ ] Respect robots.txt always
- [ ] Placeholder images
