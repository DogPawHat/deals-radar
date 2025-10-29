# 🔥 Deals Radar — Real-Time Deal Tracking Website

**Tech Stack:** [TanStack Start](https://tanstack.com/start) · [Convex](https://www.convex.dev) · [Firecrawl](https://firecrawl.dev) · [Netlify](https://www.netlify.com)

**Hackathon:** [TanStack Start Hackathon 2025](https://www.convex.dev/hackathons/tanstack)

---

## 🎯 Concept

**Deals Radar** is a real-time website that tracks online product deals from multiple sources.  
It automatically crawls known “deal” pages, extracts product and pricing data, and updates a live dashboard showing discounts and price changes in real time.

Convex powers the live data layer and background tasks.  
Firecrawl extracts structured deal information from retail pages.  
Netlify hosts both the app and serverless webhooks for ingestion.

---

## 🧩 Stack Integration

| Service            | Role                                 | Why                                                                    |
| ------------------ | ------------------------------------ | ---------------------------------------------------------------------- |
| **TanStack Start** | Frontend framework                   | Modern React meta-framework for routing, data loading, and fast DX     |
| **Convex**         | Backend + realtime DB + scheduler    | Stores deals, runs cron jobs to trigger crawls, streams live updates   |
| **Firecrawl**      | Web crawling + structured extraction | Pulls product title, price, URL, and image from deal pages             |
| **Netlify**        | Hosting + serverless functions       | Hosts the frontend and provides an API endpoint for Firecrawl webhooks |

---

## 🧠 Core Features

- 🕒 **Automatic Crawling:** Convex cron job triggers Firecrawl to crawl deal pages every few minutes.
- 🧾 **Structured Extraction:** Firecrawl returns JSON with `{ title, url, price, msrp, currency, image }`.
- 💾 **Persistent Storage:** Convex stores deals, price history, and sources.
- ⚡ **Realtime Updates:** When Convex data changes, the UI updates instantly.
- 📈 **Price History:** Track price trends and discounts over time.
- 🏷️ **Filtering & Sorting:** Filter by merchant, discount %, and time added.
- 📣 **(Stretch)** Deal alerts, upvotes, or affiliate integration.

---

## 🧱 Data Model (Convex)

```ts
deals: {
  _id: Id<"deals">,
  merchant: string,
  title: string,
  url: string,
  image?: string,
  currentPrice: number,
  currency: string,
  msrp?: number,
  percentOff?: number,
  tags: string[],
  firstSeenAt: number,
  lastSeenAt: number,
  score: number
}

priceHistory: {
  _id: Id<"priceHistory">,
  dealId: Id<"deals">,
  price: number,
  at: number
}

sources: {
  _id: Id<"sources">,
  name: string,
  url: string,
  enabled: boolean,
  crawlEveryMins: number,
  lastCrawlAt?: number,
  schema: object
}
```

---

## 🔁 Workflow

1. **Convex cron job** (`crawlTick`) runs every N minutes.
2. It reads active `sources` and sends Firecrawl extraction requests.
3. **Firecrawl** scrapes and returns structured results to a **Netlify webhook**.
4. The **webhook** calls `convex.mutation("deals/upsertBatch", payload)` to update the DB.
5. **TanStack Start UI** subscribes to live queries (`useQuery(api.deals.live)`).
6. New or updated deals appear instantly in the user’s dashboard.

---

## 🧮 Ranking Formula

```js
percentOff = msrp ? ((msrp - currentPrice) / msrp) * 100 : null;
freshness = exp(-minutesSinceLastSeen / 240);
dropBoost = clamp(percentOff / 40, 0, 1);
score = 0.6 * freshness + 0.4 * dropBoost;
```

Used for sorting “Top Deals”.

---

## 💻 UI Pages

| Route    | Description                                |
| -------- | ------------------------------------------ |
| `/`      | Live deals feed with filters and sorting   |
| `/d/:id` | Deal details page with price history       |
| `/add`   | Add or manage source URLs (for admin/demo) |

---

## ⚙️ Firecrawl Schema Example

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

## 🕹️ Demo Script (2–3 min)

1. Add a new source (e.g. “Amazon Tech Deals”).
2. Cron triggers Firecrawl → webhook updates Convex.
3. Deals appear live on dashboard with prices and discounts.
4. Show price drop → live update in UI.
5. Show another user’s browser instantly syncing the same data.

---

## 🚀 Deployment

- **Frontend:** Netlify static hosting (build via `pnpm build`).
- **Functions:** `/netlify/functions/firecrawl-webhook.ts`.
- **Env Vars:**
  - `CONVEX_DEPLOYMENT`
  - `CONVEX_URL`
  - `FIRECRAWL_API_KEY`
  - `WEBHOOK_SECRET`

Redirects for SPA routing:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## ✅ MVP Checklist

- [ ] Convex schema + indexes (`deals.by_url`)
- [ ] Firecrawl schema for one reliable source
- [ ] Cron job + webhook working end-to-end
- [ ] Live deal list + filters
- [ ] Price history chart
- [ ] Netlify deploy + environment config

---

## 🌟 Stretch Goals

- Email/Discord alerts when a tracked deal drops by X%.
- User “watch” lists and notifications.
- Community upvotes to boost hot deals.
- Affiliate tracking (if rules permit).

---

## ⚖️ Legal & Ethical Notes

- Respect **robots.txt** and **terms of service** of all sources.
- Prefer open feeds or sites with API access.
- Clearly mark demo data if real scraping is restricted.

---

## 🧭 Summary

**Deals Radar** shows the power of real-time web apps built with
**TanStack Start**, **Convex**, **Firecrawl**, and **Netlify**.

> 🔄 Always fresh, always live — the easiest way to track online deals dynamically.
