import { FunctionImpl, GroupImpl } from "@confect/server";
import { DatabaseReader } from "./_generated/services";
import { Effect, Layer, Option } from "effect";

import api from "./_generated/api";

const MIN_DISCOUNT = 4.99;

const getDeals = FunctionImpl.make(api, "publicDeals", "getDeals", ({ paginationOpts, sort }) =>
  Effect.gen(function* () {
    const reader = yield* DatabaseReader;

    switch (sort) {
      case "newest":
        return yield* reader
          .table("deals")
          .index("by_creation_time", "desc")
          .paginate(paginationOpts)
          .pipe(Effect.orDie);
      case "biggestDrop":
        return yield* reader
          .table("deals")
          .index("by_percentOff", (q) => q.gt("percentOff", MIN_DISCOUNT), "desc")
          .paginate(paginationOpts)
          .pipe(Effect.orDie);
      case "price":
        return yield* reader
          .table("deals")
          .index("by_price")
          .paginate(paginationOpts)
          .pipe(Effect.orDie);
      case "all":
        return yield* reader
          .table("deals")
          .index("by_percentOff", (q) => q.gt("percentOff", MIN_DISCOUNT))
          .paginate(paginationOpts)
          .pipe(Effect.orDie);
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
