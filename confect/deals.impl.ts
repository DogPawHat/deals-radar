import { FunctionImpl, GroupImpl } from "@confect/server";
import { DatabaseReader } from "./_generated/services";
import { Effect, Layer } from "effect";

import api from "./_generated/api";

const getDealsForStore = FunctionImpl.make(api, "deals", "getDealsForStore", ({ storeId }) =>
  Effect.gen(function* () {
    const db = yield* DatabaseReader;

    return yield* db
      .table("deals")
      .index("by_storeId", (q) => q.eq("storeId", storeId))
      .collect()
      .pipe(Effect.orDie);
  }),
);

export const deals = GroupImpl.make(api, "deals").pipe(Layer.provide(getDealsForStore));
