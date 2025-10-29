import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  deals: defineTable({
    merchant: v.string(),
    title: v.string(),
    url: v.string(),
    image: v.optional(v.string()),
    currentPrice: v.number(),
    currency: v.string(),
    msrp: v.optional(v.number()),
    percentOff: v.optional(v.number()),
    tags: v.array(v.string()),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    score: v.number(),
  }).index("by_url", ["url"]),
  priceHistory: defineTable({
    dealId: v.id("deals"),
    price: v.number(),
    at: v.number(),
  })
    .index("by_dealId", ["dealId"])
    .index("by_dealId_at", ["dealId", "at"]),
  sources: defineTable({
    name: v.string(),
    url: v.string(),
    enabled: v.boolean(),
    crawlEveryMins: v.number(),
    lastCrawlAt: v.optional(v.number()),
    schema: v.any(),
  }).index("by_url", ["url"]),
});
