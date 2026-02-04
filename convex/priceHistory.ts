import { Id } from "@rjdellecese/confect/server";
import { query, ConfectQueryCtx } from "./confect";
import { Schema, Effect } from "effect";

class GetPriceHistoryArgs extends Schema.Class<GetPriceHistoryArgs>("GetPriceHistoryArgs")({
  dealId: Id.Id("deals"),
}) {}

const PriceHistoryEntry = Schema.Struct({
  price: Schema.Number,
  at: Schema.Number,
});

class GetPriceHistoryResult extends Schema.Class<GetPriceHistoryResult>("GetPriceHistoryResult")({
  history: Schema.Array(PriceHistoryEntry),
}) {}

export const getPriceHistory = query({
  args: GetPriceHistoryArgs,
  returns: GetPriceHistoryResult,
  handler: Effect.fn("getPriceHistory")(function* ({ dealId }) {
    const { db } = yield* ConfectQueryCtx;
    const history = yield* db
      .query("priceHistory")
      .withIndex("by_dealId", (q) => q.eq("dealId", dealId))
      .collect();

    const sorted = history.sort((a, b) => a.at - b.at);
    return { history: sorted.map((h) => ({ price: h.price, at: h.at })) };
  }),
});
