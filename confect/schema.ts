import { GenericId } from "@confect/core";
import { DatabaseSchema, Table } from "@confect/server";
import { Schema } from "effect";

export const deals = Table.make(
  "deals",
  Schema.Struct({
    storeId: GenericId.GenericId("stores"),
    title: Schema.String,
    url: Schema.String,
    canonicalUrl: Schema.String,
    dedupKey: Schema.String,
    image: Schema.optional(Schema.String),
    price: Schema.Number,
    currency: Schema.String,
    msrp: Schema.optional(Schema.Number),
    percentOff: Schema.Number,
  }),
)
  .index("by_storeId", ["storeId"])
  .index("by_dedupeKey_for_store", ["dedupKey", "storeId"])
  .index("by_percentOff", ["percentOff"])
  .index("by_price", ["price"]);

export const stores = Table.make(
  "stores",
  Schema.Struct({
    name: Schema.String,
    url: Schema.String,
    lastCrawlAt: Schema.optional(Schema.Number),
    isCrawling: Schema.Boolean,
    robotsRules: Schema.optional(Schema.String),
  }),
);

export const priceHistory = Table.make(
  "priceHistory",
  Schema.Struct({
    dealId: GenericId.GenericId("deals"),
    price: Schema.Number,
    at: Schema.Number,
  }),
).index("by_dealId", ["dealId"]);

export const crawlJobs = Table.make(
  "crawlJobs",
  Schema.Struct({
    storeId: GenericId.GenericId("stores"),
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

export const confectSchema = DatabaseSchema.make()
  .addTable(deals)
  .addTable(stores)
  .addTable(priceHistory)
  .addTable(crawlJobs);

export default confectSchema;
