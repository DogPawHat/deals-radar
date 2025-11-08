import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { workflow } from "./index";
import { internal } from "./_generated/api";
import { vWorkflowId } from "@convex-dev/workflow";
import { vResultValidator } from "@convex-dev/workpool";
import { DealExtraction } from "./zSchemas";

async function createHash(input: string): Promise<string> {
  // Encode to Uint8Array
  const data = new TextEncoder().encode(input);

  // Compute digest
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert ArrayBuffer → hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

function normalizeUrl(raw: string): string {
  const u = new URL(raw);

  // Normalize host and ports
  u.hostname = u.hostname.toLowerCase();
  if (
    (u.protocol === "http:" && u.port === "80") ||
    (u.protocol === "https:" && u.port === "443")
  )
    u.port = "";

  // Drop fragment
  u.hash = "";

  // Remove common tracking params, keep others (sorted)
  const drop = new Set([
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
  const kept = new URLSearchParams();
  for (const [k, v] of u.searchParams.entries())
    if (!drop.has(k)) kept.append(k, v);
  const keptSorted = new URLSearchParams(
    [...kept.entries()].sort((a, b) => a[0].localeCompare(b[0])),
  );
  u.search = keptSorted.toString() ? `?${keptSorted.toString()}` : "";

  // Normalize trailing slash (except root)
  if (u.pathname.endsWith("/") && u.pathname !== "/")
    u.pathname = u.pathname.replace(/\/+$/, "");

  const canonicalUrl = u.toString();

  return canonicalUrl;
}

async function buildDedupKey(url: string, title: string) {
  const canonicalUrl = normalizeUrl(url);
  const normalizedTitle = title.trim().toLowerCase().replace(/\s+/g, " ");
  const keyInput = `${canonicalUrl}|${normalizedTitle}`;
  const dedupKey = await createHash(keyInput);
  return { canonicalUrl, dedupKey };
}

export const extractSourceWorkflow = workflow.define({
  args: {
    store: v.object({
      _id: v.id("stores"),
      url: v.string(),
    }),
  },
  handler: async (step, args): Promise<void> => {
    const job = await step.runAction(
      internal.firecrawlNodeActions.startExtract,
      {
        urls: [args.store.url],
      },
    );

    let attempts = 0;
    let data: Array<DealExtraction> | null = null;
    while (attempts < 10 && data == null) {
      attempts++;
      const result = await step.runAction(
        internal.firecrawlNodeActions.getExtractData,
        { jobId: job.jobId },
      );
      if (result.status === "completed") {
        data = result.data;
      } else if (result.status === "failed") {
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

export const finishManualCrawl = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.object({
      storeId: v.id("stores"),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.context.storeId, {
      lastCrawlAt: Date.now(),
      isCrawling: false,
    });
  },
});

export const updateDealsForStore = internalMutation({
  args: {
    storeId: v.id("stores"),
    deals: v.array(
      v.object({
        title: v.string(),
        url: v.string(),
        image: v.optional(v.string()),
        price: v.number(),
        currency: v.string(),
        msrp: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const deal of args.deals) {
      const dedupKey = await buildDedupKey(deal.url, deal.title);
      const existingDeal = await ctx.db
        .query("deals")
        .withIndex("by_dedupKey_for_store", (q) =>
          q.eq("dedupKey", dedupKey.dedupKey).eq("storeId", args.storeId),
        )
        .unique();

      if (existingDeal) {
        await ctx.db.patch(existingDeal._id, {
          ...deal,
          storeId: args.storeId,
          canonicalUrl: dedupKey.canonicalUrl,
          dedupKey: dedupKey.dedupKey,
        });
      } else {
        await ctx.db.insert("deals", {
          ...deal,
          storeId: args.storeId,
          canonicalUrl: dedupKey.canonicalUrl,
          dedupKey: dedupKey.dedupKey,
        });
      }
    }
  },
});

export const beginManualCrawl = mutation({
  args: {
    storeId: v.id("stores"),
  },
  handler: async (ctx, args) => {
    const store = await ctx.db.get(args.storeId);
    if (!store) {
      throw new Error(`Store ${args.storeId} not found`);
    }
    if (store.isCrawling) {
      throw new Error("Crawl already in progress for this store.");
    }
    await ctx.db.patch(args.storeId, {
      isCrawling: true,
      lastCrawlAt: Date.now(),
    });
    await workflow.start(ctx, internal.crawls.extractSourceWorkflow, {
      store: {
        _id: args.storeId,
        url: store.url,
      },
    });
  },
});
