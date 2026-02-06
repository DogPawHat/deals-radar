import { Id } from "@rjdellecese/confect/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { query as confectQuery, ConfectQueryCtx } from "./confect";
import { Schema, Effect, Option } from "effect";
import { confectSchema } from "./schema";

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

export const getDeals = query({
  args: {
    sort: v.union(
      v.literal("newest"),
      v.literal("biggestDrop"),
      v.literal("price"),
      v.literal("all"),
    ),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    switch (args.sort) {
      case "newest":
        return await ctx.db
          .query("deals")
          .order("desc")
          .filter((q) => q.gt(q.field("percentOff"), MIN_DISCOUNT))
          .paginate(args.paginationOpts);
      case "biggestDrop":
        return await ctx.db
          .query("deals")
          .withIndex("by_percentOff", (q) => q.gt("percentOff", MIN_DISCOUNT))
          .order("desc")
          .paginate(args.paginationOpts);
      case "price":
        return await ctx.db
          .query("deals")
          .withIndex("by_price")
          .order("asc")
          .filter((q) => q.gt(q.field("percentOff"), MIN_DISCOUNT))
          .paginate(args.paginationOpts);
      case "all":
        return await ctx.db
          .query("deals")
          .withIndex("by_percentOff", (q) => q.gt("percentOff", MIN_DISCOUNT))
          .paginate(args.paginationOpts);
    }
  },
});

export const getDealById = confectQuery({
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
