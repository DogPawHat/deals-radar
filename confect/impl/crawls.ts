import { FunctionImpl, GroupImpl } from "@confect/server";
import { DatabaseReader, DatabaseWriter } from "../_generated/services";
import { Effect, Layer } from "effect";

import api from "../_generated/api";
import { buildDedupKey } from "../../server/lib/dedup";

const success = { success: true } as const;

const finishManualCrawl = FunctionImpl.make(api, "crawls", "finishManualCrawl", ({ context }) =>
  Effect.gen(function* () {
    const db = yield* DatabaseWriter;

    yield* db
      .table("stores")
      .patch(context.storeId, {
        lastCrawlAt: Date.now(),
        isCrawling: false,
      })
      .pipe(Effect.orDie);

    return success;
  }),
);

const updateDealsForStore = FunctionImpl.make(
  api,
  "crawls",
  "updateDealsForStore",
  ({ deals, storeId }) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const writer = yield* DatabaseWriter;
      const now = Date.now();

      yield* Effect.forEach(
        deals,
        (deal) =>
          Effect.gen(function* () {
            const dedup = yield* buildDedupKey(deal.url, deal.title).pipe(Effect.orDie);
            const percentOff = deal.msrp
              ? Math.round((1 - deal.price / deal.msrp) * 100)
              : (deal.percentOff ?? 0);

            const existingDeal = yield* reader
              .table("deals")
              .get("by_dedupeKey_for_store", dedup.dedupKey, storeId)
              .pipe(Effect.option);

            if (existingDeal._tag === "None") {
              const newDealId = yield* writer
                .table("deals")
                .insert({
                  ...deal,
                  storeId,
                  canonicalUrl: dedup.canonicalUrl,
                  dedupKey: dedup.dedupKey,
                  percentOff,
                })
                .pipe(Effect.orDie);

              yield* writer
                .table("priceHistory")
                .insert({
                  dealId: newDealId,
                  price: deal.price,
                  at: now,
                })
                .pipe(Effect.orDie);

              return;
            }

            yield* writer
              .table("deals")
              .patch(existingDeal.value._id, {
                ...deal,
                storeId,
                canonicalUrl: dedup.canonicalUrl,
                dedupKey: dedup.dedupKey,
                percentOff,
              })
              .pipe(Effect.orDie);

            if (existingDeal.value.price !== deal.price) {
              yield* writer
                .table("priceHistory")
                .insert({
                  dealId: existingDeal.value._id,
                  price: deal.price,
                  at: now,
                })
                .pipe(Effect.orDie);
            }
          }),
        { concurrency: 5 },
      );

      return success;
    }),
);

const beginManualCrawl = FunctionImpl.make(api, "crawls", "beginManualCrawl", ({ storeId }) =>
  Effect.gen(function* () {
    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;
    const store = yield* reader.table("stores").get(storeId).pipe(Effect.orDie);

    if (store.isCrawling) {
      return yield* Effect.die(new Error("Crawl already in progress for this store"));
    }

    yield* writer.table("stores").patch(storeId, { url: store.url }).pipe(Effect.orDie);
    return success;
  }),
);

export const crawls = GroupImpl.make(api, "crawls").pipe(
  Layer.provide(finishManualCrawl),
  Layer.provide(updateDealsForStore),
  Layer.provide(beginManualCrawl),
);
