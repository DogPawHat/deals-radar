import { defineSchema, defineTable, Id } from "@rjdellecese/confect/server";
import { Schema } from "effect";

export const deals = defineTable(
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

export const stores = defineTable(
  Schema.Struct({
    name: Schema.String,
    url: Schema.String,
    lastCrawlAt: Schema.optional(Schema.Number),
    isCrawling: Schema.Boolean,
  }),
);

export const priceHistory = defineTable(
  Schema.Struct({
    dealId: Id.Id("deals"),
    price: Schema.Number,
    at: Schema.Number,
  }),
).index("by_dealId", ["dealId"]);

export const crawlJobs = defineTable(
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

export const confectSchema = defineSchema({
  deals,
  stores,
  priceHistory,
  crawlJobs,
});

export default confectSchema.convexSchemaDefinition;
