import { FunctionImpl, GroupImpl } from "@confect/server";
import { DatabaseReader } from "./_generated/services";
import { Effect, Layer } from "effect";

import api from "./_generated/api";

const getPriceHistory = FunctionImpl.make(api, "priceHistory", "getPriceHistory", ({ dealId }) =>
  Effect.gen(function* () {
    const db = yield* DatabaseReader;
    const history = yield* db
      .table("priceHistory")
      .index("by_dealId", (q) => q.eq("dealId", dealId))
      .collect()
      .pipe(Effect.orDie);

    return {
      history: [...history]
        .sort((a, b) => a.at - b.at)
        .map((entry) => ({
          price: entry.price,
          at: entry.at,
        })),
    };
  }),
);

export const priceHistory = GroupImpl.make(api, "priceHistory").pipe(
  Layer.provide(getPriceHistory),
);
