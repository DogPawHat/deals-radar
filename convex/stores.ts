import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: { storeId: v.id("stores") },
  handler: async (ctx, { storeId }) => {
    return ctx.db.get(storeId);
  },
});

export const deleteById = mutation({
  args: { storeId: v.id("stores") },
  handler: async (ctx, { storeId }) => {
    const existing = await ctx.db.get(storeId);
    if (!existing) {
      throw new Error(`Store ${storeId} not found`);
    }
    await ctx.db.delete(storeId);
  },
});
