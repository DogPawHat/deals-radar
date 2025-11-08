import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  deals: defineTable({
    /** The store ID */
    storeId: v.id("stores"),
    /** The title or name of the product/deal */
    title: v.string(),
    /** The full URL of the deal page */
    url: v.string(),
    /** The canonical URL of the deal page */
    canonicalUrl: v.string(),
    /** The dedup key for the deal */
    dedupKey: v.string(),
    /** The main product image URL */
    image: v.optional(v.string()),
    /** The current price of the item */
    price: v.number(),
    /**
     * The currency code (e.g., USD, EUR)
     * Note: Not enforcing length(3) at validator level
     */
    currency: v.string(),
    /** The original/MSRP price before discount */
    msrp: v.optional(v.number()),
  })
    .index("by_storeId", ["storeId"])
    .index("by_dedupKey_for_store", ["dedupKey", "storeId"]),
  stores: defineTable({
    name: v.string(),
    url: v.string(),
    lastCrawlAt: v.optional(v.number()),
    isCrawling: v.boolean(),
  }),
});
