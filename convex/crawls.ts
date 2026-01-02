import { Effect, Schema, Option } from "effect";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { internalMutation, mutation, ConfectMutationCtx } from "./confect";
import { Id } from "@rjdellecese/confect/server";
import { workflow } from "./index";
import { DealExtractions } from "./eSchemas";

class GenericSucessType extends Schema.TaggedClass<GenericSucessType>()("GenericSucessType", {
  success: Schema.Literal(true),
}) {}

// Tracking parameters to drop
const DROP_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "mc_eid",
  "mc_cid",
  "ref",
  "referrer",
  "aff",
  "aff_id",
  "affiliate",
  "utm_id",
  "utm_reader",
  "utm_viz_id",
  "utm_pubreferrer",
  "oly_enc_id",
  "oly_anon_id",
  "ascsrc",
  "cmp",
  "_branch_match_id",
  "_branch_referrer",
  "igshid",
  "mkt_tok",
  "spm",
]);

class CreateHashError extends Schema.TaggedError<CreateHashError>()("CreateHashError", {
  message: Schema.String,
  error: Schema.Defect,
}) {}

class NormalizeUrlError extends Schema.TaggedError<NormalizeUrlError>()("NormalizeUrlError", {
  message: Schema.String,
  error: Schema.Defect,
}) {}

// SHA-256 hash using Web Crypto API
const createHash = (input: string): Effect.Effect<string, CreateHashError> =>
  Effect.tryPromise({
    try: async () => {
      const data = new TextEncoder().encode(input);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    },
    catch: (error) => CreateHashError.make({ message: `Hashing failed: ${error}`, error }),
  });

// Normalize URL with Effect
const normalizeUrl = (raw: string): Effect.Effect<string, NormalizeUrlError> =>
  Effect.try({
    try: () => {
      const u = new URL(raw);

      // Normalize host
      u.hostname = u.hostname.toLowerCase();

      // Remove default ports
      if (
        (u.protocol === "http:" && u.port === "80") ||
        (u.protocol === "https:" && u.port === "443")
      ) {
        u.port = "";
      }

      // Drop fragment
      u.hash = "";

      // Filter and sort query parameters
      const kept = new URLSearchParams();
      for (const [k, v] of u.searchParams.entries()) {
        if (!DROP_PARAMS.has(k)) {
          kept.append(k, v);
        }
      }

      const keptSorted = new URLSearchParams(
        [...kept.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      );

      u.search = keptSorted.toString() ? `?${keptSorted.toString()}` : "";

      // Normalize trailing slash (except root)
      if (u.pathname.endsWith("/") && u.pathname !== "/") {
        u.pathname = u.pathname.replace(/\/+$/, "");
      }

      return u.toString();
    },
    catch: (error) =>
      NormalizeUrlError.make({ message: `URL normalization failed: ${error}`, error }),
  });

// Normalize title
const normalizeTitle = (title: string): string => title.trim().toLowerCase().replace(/\s+/g, " ");

// Build deduplication key using Effect pipeline
const buildDedupKey = (url: string, title: string) =>
  Effect.gen(function* () {
    const canonicalUrl = yield* normalizeUrl(url);
    const normalizedTitle = normalizeTitle(title);
    const keyInput = `${canonicalUrl}|${normalizedTitle}`;
    const dedupKey = yield* createHash(keyInput);
    return { canonicalUrl, dedupKey };
  });

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
              }),
            onSome: (existingDeal) =>
              ctx.db.patch(existingDeal._id, {
                ...deal,
                storeId,
                canonicalUrl: dedupKeyResult.canonicalUrl,
                dedupKey: dedupKeyResult.dedupKey,
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

class CrawlInProgressError extends Schema.TaggedError<CrawlInProgressError>("CrawlInProgressError")(
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
