import { FunctionImpl, GroupImpl } from "@confect/server";
import { DatabaseReader, QueryCtx } from "../_generated/services";
import { Effect, Layer, Option } from "effect";

import api from "../_generated/api";

const MIN_DISCOUNT = 4.99;

const normalizePage = <
  T extends {
    page: unknown;
    isDone: boolean;
    continueCursor: string;
    splitCursor?: string | null;
    pageStatus?: "SplitRecommended" | "SplitRequired" | null;
  },
>(
  result: T,
) => ({
  ...result,
  splitCursor: result.splitCursor ?? null,
  pageStatus: result.pageStatus ?? null,
});

const getDeals = FunctionImpl.make(api, "publicDeals", "getDeals", ({ paginationOpts, sort }) =>
  Effect.gen(function* () {
    const ctx = yield* QueryCtx;

    switch (sort) {
      case "newest":
        return yield* Effect.promise(() =>
          ctx.db
            .query("deals")
            .order("desc")
            .filter((q) => q.gt(q.field("percentOff"), MIN_DISCOUNT))
            .paginate(paginationOpts),
        ).pipe(Effect.map(normalizePage), Effect.orDie);
      case "biggestDrop":
        return yield* Effect.promise(() =>
          ctx.db
            .query("deals")
            .withIndex("by_percentOff", (q) => q.gt("percentOff", MIN_DISCOUNT))
            .order("desc")
            .paginate(paginationOpts),
        ).pipe(Effect.map(normalizePage), Effect.orDie);
      case "price":
        return yield* Effect.promise(() =>
          ctx.db
            .query("deals")
            .withIndex("by_price")
            .order("asc")
            .filter((q) => q.gt(q.field("percentOff"), MIN_DISCOUNT))
            .paginate(paginationOpts),
        ).pipe(Effect.map(normalizePage), Effect.orDie);
      case "all":
        return yield* Effect.promise(() =>
          ctx.db
            .query("deals")
            .withIndex("by_percentOff", (q) => q.gt("percentOff", MIN_DISCOUNT))
            .paginate(paginationOpts),
        ).pipe(Effect.map(normalizePage), Effect.orDie);
    }
  }),
);

const getDealById = FunctionImpl.make(api, "publicDeals", "getDealById", ({ dealId }) =>
  Effect.gen(function* () {
    const db = yield* DatabaseReader;
    const deal = yield* db.table("deals").get(dealId).pipe(Effect.orDie);
    const store = yield* db.table("stores").get(deal.storeId).pipe(Effect.option);

    return {
      deal,
      store: Option.isSome(store)
        ? {
            _id: store.value._id,
            name: store.value.name,
            url: store.value.url,
          }
        : undefined,
    };
  }),
);

export const publicDeals = GroupImpl.make(api, "publicDeals").pipe(
  Layer.provide(getDeals),
  Layer.provide(getDealById),
);
