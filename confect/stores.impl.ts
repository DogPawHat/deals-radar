import { FunctionImpl, GroupImpl } from "@confect/server";
import { DatabaseReader, DatabaseWriter } from "./_generated/services";
import { Effect, Layer } from "effect";

import api from "./_generated/api";

const getById = FunctionImpl.make(api, "stores", "getById", ({ storeId }) =>
  Effect.gen(function* () {
    const db = yield* DatabaseReader;
    return yield* db.table("stores").get(storeId).pipe(Effect.orDie);
  }),
);

const deleteById = FunctionImpl.make(api, "stores", "deleteById", ({ storeId }) =>
  Effect.gen(function* () {
    const reader = yield* DatabaseReader;
    const db = yield* DatabaseWriter;
    yield* reader
      .table("stores")
      .get(storeId)
      .pipe(Effect.catchAll(() => Effect.die(new Error(`Store ${storeId} not found`))));
    yield* db.table("stores").delete(storeId);
    return null;
  }),
);

export const stores = GroupImpl.make(api, "stores").pipe(
  Layer.provide(getById),
  Layer.provide(deleteById),
);
