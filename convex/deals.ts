import { v } from "convex/values";
import { query } from "./_generated/server";

export const getDealsForStore = query({
  args: { storeId: v.id("stores") },
  handler: async (ctx, { storeId }) => {
    return ctx.db
      .query("deals")
      .withIndex("by_storeId", (q) => q.eq("storeId", storeId));
  },
});
