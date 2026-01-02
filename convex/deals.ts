import { Id } from "@rjdellecese/confect/server";
import { query, ConfectQueryCtx } from "./confect";
import { Schema, Effect } from "effect";
import { confectSchema } from "./schema";

class GetDealsForStoreArgs extends Schema.Class<GetDealsForStoreArgs>("GetDealsForStoreArgs")({
  storeId: Id.Id("stores"),
}) {}

const GetDealsForStoreResult = Schema.Array(confectSchema.tableSchemas.deals.withSystemFields);

export const getDealsForStore = query({
  args: GetDealsForStoreArgs,
  returns: GetDealsForStoreResult,
  handler: Effect.fn("getDealsForStore")(function* ({ storeId }) {
    const { db } = yield* ConfectQueryCtx;
    return yield* db
      .query("deals")
      .withIndex("by_storeId", (q) => q.eq("storeId", storeId))
      .collect();
  }),
});
