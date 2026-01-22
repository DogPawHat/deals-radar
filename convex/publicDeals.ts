import { query, ConfectQueryCtx } from "./confect";
import { Schema, Effect } from "effect";
import { confectSchema } from "./schema";

class GetDealsArgs extends Schema.Class<GetDealsArgs>("GetDealsArgs")({
  limit: Schema.optionalWith(Schema.Number, { exact: true }),
}) {}

const DealPublicFields = confectSchema.tableSchemas.deals.withoutSystemFields;

class TabNewestResult extends Schema.Class<TabNewestResult>("TabNewestResult")({
  deals: Schema.Array(DealPublicFields),
  cursor: Schema.optional(Schema.String),
}) {}

class TabBiggestDropResult extends Schema.Class<TabBiggestDropResult>("TabBiggestDropResult")({
  deals: Schema.Array(DealPublicFields),
  cursor: Schema.optional(Schema.String),
}) {}

class TabPriceResult extends Schema.Class<TabPriceResult>("TabPriceResult")({
  deals: Schema.Array(DealPublicFields),
  cursor: Schema.optional(Schema.String),
}) {}

class TabAllResult extends Schema.Class<TabAllResult>("TabAllResult")({
  deals: Schema.Array(DealPublicFields),
  cursor: Schema.optional(Schema.String),
}) {}

const MIN_DISCOUNT = 4.99;

export const getDealsNewest = query({
  args: GetDealsArgs,
  returns: TabNewestResult,
  handler: Effect.fn("getDealsNewest")(function* (args) {
    const limit = args.limit ?? 20;
    const { db } = yield* ConfectQueryCtx;
    const allDeals = yield* db
      .query("deals")
      .withIndex("by_percentOff", (q) => q.gt("percentOff", MIN_DISCOUNT))
      .collect();

    const sorted = allDeals.sort((a, b) => b._creationTime - a._creationTime);
    return { deals: sorted.slice(0, limit), cursor: undefined };
  }),
});

export const getDealsBiggestDrop = query({
  args: GetDealsArgs,
  returns: TabBiggestDropResult,
  handler: Effect.fn("getDealsBiggestDrop")(function* (args) {
    const limit = args.limit ?? 20;
    const { db } = yield* ConfectQueryCtx;
    const allDeals = yield* db
      .query("deals")
      .withIndex("by_percentOff", (q) => q.gt("percentOff", MIN_DISCOUNT))
      .collect();

    const sorted = allDeals.sort((a, b) => b.percentOff - a.percentOff);
    return { deals: sorted.slice(0, limit), cursor: undefined };
  }),
});

export const getDealsByPrice = query({
  args: GetDealsArgs,
  returns: TabPriceResult,
  handler: Effect.fn("getDealsByPrice")(function* (args) {
    const limit = args.limit ?? 20;
    const { db } = yield* ConfectQueryCtx;
    const allDeals = yield* db
      .query("deals")
      .withIndex("by_percentOff", (q) => q.gt("percentOff", MIN_DISCOUNT))
      .collect();

    const sorted = allDeals.sort((a, b) => a.price - b.price);
    return { deals: sorted.slice(0, limit), cursor: undefined };
  }),
});

export const getDealsAll = query({
  args: GetDealsArgs,
  returns: TabAllResult,
  handler: Effect.fn("getDealsAll")(function* (args) {
    const limit = args.limit ?? 20;
    const { db } = yield* ConfectQueryCtx;
    const allDeals = yield* db
      .query("deals")
      .withIndex("by_percentOff", (q) => q.gt("percentOff", MIN_DISCOUNT))
      .collect();

    return { deals: allDeals.slice(0, limit), cursor: undefined };
  }),
});
