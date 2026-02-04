import { Id } from "@rjdellecese/confect/server";
import { query, ConfectQueryCtx } from "./confect";
import { Schema, Effect, Option } from "effect";
import { confectSchema } from "./schema";

class GetDealsArgs extends Schema.Class<GetDealsArgs>("GetDealsArgs")({
  limit: Schema.optionalWith(Schema.Number, { exact: true }),
  cursor: Schema.optionalWith(Schema.String, { exact: true }),
}) {}

const DealPublicFields = confectSchema.tableSchemas.deals.withSystemFields;

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

class GetDealByIdArgs extends Schema.Class<GetDealByIdArgs>("GetDealByIdArgs")({
  dealId: Id.Id("deals"),
}) {}

const StoreSummary = Schema.Struct({
  _id: Id.Id("stores"),
  name: Schema.String,
  url: Schema.String,
});

const DealDetailResult = Schema.Struct({
  deal: confectSchema.tableSchemas.deals.withSystemFields,
  store: Schema.optional(StoreSummary),
});

const MIN_DISCOUNT = 4.99;
const DEFAULT_LIMIT = 20;

function paginateDeals(deals: ReadonlyArray<typeof DealPublicFields.Type>, args: GetDealsArgs) {
  const limit = args.limit ?? DEFAULT_LIMIT;
  const cursorIndex = args.cursor ? deals.findIndex((deal) => deal._id === args.cursor) : -1;
  const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const nextDeals = deals.slice(startIndex, startIndex + limit);
  const nextCursor =
    nextDeals.length === limit && startIndex + limit < deals.length
      ? nextDeals[nextDeals.length - 1]?._id
      : undefined;

  return { deals: nextDeals, cursor: nextCursor };
}

export const getDealsNewest = query({
  args: GetDealsArgs,
  returns: TabNewestResult,
  handler: Effect.fn("getDealsNewest")(function* (args) {
    const { db } = yield* ConfectQueryCtx;
    const allDeals = yield* db
      .query("deals")
      .withIndex("by_percentOff", (q) => q.gt("percentOff", MIN_DISCOUNT))
      .collect();

    const sorted = allDeals.sort((a, b) => b._creationTime - a._creationTime);
    return paginateDeals(sorted, args);
  }),
});

export const getDealsBiggestDrop = query({
  args: GetDealsArgs,
  returns: TabBiggestDropResult,
  handler: Effect.fn("getDealsBiggestDrop")(function* (args) {
    const { db } = yield* ConfectQueryCtx;
    const allDeals = yield* db
      .query("deals")
      .withIndex("by_percentOff", (q) => q.gt("percentOff", MIN_DISCOUNT))
      .collect();

    const sorted = allDeals.sort((a, b) => b.percentOff - a.percentOff);
    return paginateDeals(sorted, args);
  }),
});

export const getDealsByPrice = query({
  args: GetDealsArgs,
  returns: TabPriceResult,
  handler: Effect.fn("getDealsByPrice")(function* (args) {
    const { db } = yield* ConfectQueryCtx;
    const allDeals = yield* db
      .query("deals")
      .withIndex("by_percentOff", (q) => q.gt("percentOff", MIN_DISCOUNT))
      .collect();

    const sorted = allDeals.sort((a, b) => a.price - b.price);
    return paginateDeals(sorted, args);
  }),
});

export const getDealsAll = query({
  args: GetDealsArgs,
  returns: TabAllResult,
  handler: Effect.fn("getDealsAll")(function* (args) {
    const { db } = yield* ConfectQueryCtx;
    const allDeals = yield* db
      .query("deals")
      .withIndex("by_percentOff", (q) => q.gt("percentOff", MIN_DISCOUNT))
      .collect();

    return paginateDeals(allDeals, args);
  }),
});

export const getDealById = query({
  args: GetDealByIdArgs,
  returns: DealDetailResult,
  handler: Effect.fn("getDealById")(function* ({ dealId }) {
    const { db } = yield* ConfectQueryCtx;
    const dealOption = yield* db.get(dealId);
    const deal = yield* dealOption;
    const storeOption = yield* db.get(deal.storeId);

    return {
      deal,
      store: Option.isNone(storeOption)
        ? undefined
        : {
            _id: storeOption.value._id,
            name: storeOption.value.name,
            url: storeOption.value.url,
          },
    };
  }),
});
