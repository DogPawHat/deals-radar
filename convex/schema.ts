import { defineSchema, defineTable, Id } from "@rjdellecese/confect/server";
import { Schema } from "effect";

export const confectSchema = defineSchema({
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
    .index("by_dedupeKey_for_store", ["dedupKey", "storeId"]),
  stores: defineTable(
    Schema.Struct({
      name: Schema.String,
      url: Schema.String,
      lastCrawlAt: Schema.optional(Schema.Number),
      isCrawling: Schema.Boolean,
    }),
  ),
});

export default confectSchema.convexSchemaDefinition;
