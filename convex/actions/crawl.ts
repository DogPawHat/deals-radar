"use node";

import Firecrawl from "@mendable/firecrawl-js";
import { v } from "convex/values";
import { env } from "../../src/env/convex";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type SourceDoc = Doc<"sources">;

const DEFAULT_EXTRACT_PROMPT =
  "Extract current product deals using the provided schema. Include active deals only.";

function getFirecrawlClient() {
  const apiKey = env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not configured for this deployment.");
  }
  return new Firecrawl({ apiKey });
}

async function performExtract(client: Firecrawl, source: SourceDoc) {
  if (!source.schema) {
    throw new Error(
      `Source ${source._id} does not have a Firecrawl schema configured.`,
    );
  }
  return client.extract({
    urls: [source.url],
    schema: source.schema,
    prompt: DEFAULT_EXTRACT_PROMPT,
    showSources: true,
  });
}

export const crawlSource = action({
  args: { sourceId: v.id("sources") },
  async handler(ctx, { sourceId }) {
    const source = await ctx.runQuery(internal.sources.getById, { sourceId });
    if (!source) {
      throw new Error(`Source ${sourceId} not found`);
    }
    if (!source.enabled) {
      return { skipped: true, reason: "Source is disabled." };
    }

    const startedAt = Date.now();
    const firecrawl = getFirecrawlClient();
    const extractResult = await performExtract(firecrawl, source);

    if (extractResult.success) {
      await ctx.runMutation(internal.sources.markCrawled, {
        sourceId,
        lastCrawlAt: startedAt,
      });
    }

    return {
      sourceId,
      success: extractResult.success ?? false,
      status: extractResult.status ?? null,
      jobId: extractResult.id ?? null,
      data: extractResult.data ?? null,
      warning: extractResult.warning ?? null,
      error: extractResult.error ?? null,
      sources: extractResult.sources ?? null,
    };
  },
});

export const crawlEnabledSources = action({
  args: { limit: v.optional(v.number()) },
  async handler(ctx, { limit }) {
    const sources: SourceDoc[] = await ctx.runQuery(
      internal.sources.listEnabled,
      {},
    );
    const selected: SourceDoc[] =
      typeof limit === "number" ? sources.slice(0, limit) : sources;

    const firecrawl = getFirecrawlClient();
    const results: Array<{
      sourceId: Id<"sources">;
      success: boolean;
      status: string | null;
      jobId: string | null;
      warning: string | null;
      error: string | null;
    }> = [];
    for (const source of selected) {
      try {
        const extractResult = await performExtract(firecrawl, source);
        if (extractResult.success) {
          await ctx.runMutation(internal.sources.markCrawled, {
            sourceId: source._id,
            lastCrawlAt: Date.now(),
          });
        }
        results.push({
          sourceId: source._id,
          success: extractResult.success ?? false,
          status: extractResult.status ?? null,
          jobId: extractResult.id ?? null,
          warning: extractResult.warning ?? null,
          error: extractResult.error ?? null,
        });
      } catch (error) {
        results.push({
          sourceId: source._id,
          success: false,
          status: "failed",
          jobId: null,
          warning: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      count: results.length,
      results,
    };
  },
});
