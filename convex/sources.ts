import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getById = internalQuery({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, { sourceId }) => {
    return ctx.db.get(sourceId);
  },
});

export const listEnabled = internalQuery({
  handler: async (ctx) => {
    return ctx.db
      .query("sources")
      .filter((q) => q.eq(q.field("enabled"), true))
      .collect();
  },
});

export const markCrawled = internalMutation({
  args: {
    sourceId: v.id("sources"),
    lastCrawlAt: v.number(),
  },
  handler: async (ctx, { sourceId, lastCrawlAt }) => {
    const source = await ctx.db.get(sourceId);
    if (!source) {
      throw new Error(`Source ${sourceId} not found`);
    }
    await ctx.db.patch(sourceId, { lastCrawlAt });
  },
});
