import { Effect, Schema, Option } from "effect";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { internalMutation, mutation, ConfectMutationCtx } from "./confect";
import { Id } from "@rjdellecese/confect/server";
import { workflow } from "./index";
import { DealExtractions } from "./eSchemas";
import { buildDedupKey } from "./lib/dedup";

class GenericSucessType extends Schema.TaggedClass<GenericSucessType>()("GenericSucessType", {
  success: Schema.Literal(true),
}) {}

export const extractSourceWorkflow = workflow.define({
  args: {
    store: v.object({
      _id: v.id("stores"),
      url: v.string(),
    }),
  },
  handler: async (step, args): Promise<void> => {
    const job = await step.runAction(internal.firecrawlNodeActions.startAgent, {
      urls: [args.store.url],
    });

    let attempts = 0;
    let data: typeof DealExtractions.Type | null = null;
    while (attempts < 10 && data == null) {
      attempts++;
      const result = await step.runAction(internal.firecrawlNodeActions.getAgentData, {
        jobId: job.jobId,
      });
      if (result._tag === "AgentStateCompleted") {
        data = result.data;
      } else {
        throw new Error("Firecrawl extraction failed");
      }
    }

    if (data == null) {
      throw new Error("Firecrawl extraction timed out");
    }

    await step.runMutation(internal.crawls.updateDealsForStore, {
      storeId: args.store._id,
      deals: data,
    });
  },
});

class FinishManualCrawlArgs extends Schema.Struct({
  workflowId: Id.Id("workflows"),
  result: Schema.Struct({
    deals: Schema.Array(
      Schema.Struct({
        title: Schema.String,
        url: Schema.String,
        image: Schema.optional(Schema.String),
        price: Schema.Number,
        currency: Schema.String,
      }),
    ),
  }),
  context: Schema.Struct({
    storeId: Id.Id("stores"),
  }),
}) {}

export const finishManualCrawl = internalMutation({
  args: FinishManualCrawlArgs,
  returns: GenericSucessType,
  handler: ({ context }) =>
    Effect.gen(function* () {
      const ctx = yield* ConfectMutationCtx;
      yield* ctx.db.patch(context.storeId, {
        lastCrawlAt: Date.now(),
        isCrawling: false,
      });
      return GenericSucessType.make({ success: true });
    }),
});

class UpdateDealsForStoreArgs extends Schema.Struct({
  storeId: Id.Id("stores"),
  deals: Schema.Array(
    Schema.Struct({
      title: Schema.String,
      url: Schema.String,
      image: Schema.optional(Schema.String),
      price: Schema.Number,
      currency: Schema.String,
      msrp: Schema.optional(Schema.Number),
    }),
  ),
}) {}

export const updateDealsForStore = internalMutation({
  args: UpdateDealsForStoreArgs,
  returns: GenericSucessType,
  handler: Effect.fn("updateDealsForStore")(function* ({ storeId, deals }) {
    const ctx = yield* ConfectMutationCtx;

    yield* Effect.all(
      deals.map((deal) =>
        Effect.gen(function* () {
          const dedupKeyResult = yield* buildDedupKey(deal.url, deal.title);

          const existingDealOption = yield* ctx.db
            .query("deals")
            .withIndex("by_dedupeKey_for_store", (q) =>
              q.eq("dedupKey", dedupKeyResult.dedupKey).eq("storeId", storeId),
            )
            .unique();

          yield* Option.match(existingDealOption, {
            onNone: () =>
              ctx.db.insert("deals", {
                ...deal,
                storeId,
                canonicalUrl: dedupKeyResult.canonicalUrl,
                dedupKey: dedupKeyResult.dedupKey,
                percentOff: deal.msrp ? Math.round((1 - deal.price / deal.msrp) * 100) : 0,
              }),
            onSome: (existingDeal) =>
              ctx.db.patch(existingDeal._id, {
                ...deal,
                storeId,
                canonicalUrl: dedupKeyResult.canonicalUrl,
                dedupKey: dedupKeyResult.dedupKey,
                percentOff: deal.msrp ? Math.round((1 - deal.price / deal.msrp) * 100) : 0,
              }),
          });
        }),
      ),
      { concurrency: 5 },
    );
    return GenericSucessType.make({ success: true });
  }),
});

class BeginManualCrawlArgs extends Schema.Class<BeginManualCrawlArgs>("BeginManualCrawlArgs")({
  storeId: Id.Id("stores"),
}) {}

export class CrawlInProgressError extends Schema.TaggedError<CrawlInProgressError>()(
  "CrawlInProgressError",
  {
    message: Schema.String,
    storeId: Id.Id("stores"),
  },
) {}

export const beginManualCrawl = mutation({
  args: BeginManualCrawlArgs,
  returns: GenericSucessType,
  handler: Effect.fn("beginManualCrawl")(function* ({ storeId }) {
    const { db } = yield* ConfectMutationCtx;
    const storeOption = yield* db.get(storeId);
    const store = yield* storeOption;

    if (store.isCrawling) {
      return yield* CrawlInProgressError.make({
        message: "Crawl already in progress for this store",
        storeId: store._id,
      });
    }
    yield* db.patch(storeId, {
      url: store.url,
    });
    return GenericSucessType.make({ success: true });
  }),
});
