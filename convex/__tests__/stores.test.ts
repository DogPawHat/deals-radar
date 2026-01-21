import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob([
  "../stores.ts",
  "../deals.ts",
  "../crawls.ts",
  "../schema.ts",
  "../confect.ts",
  "../eSchemas.ts",
  "../firecrawlNodeActions.ts",
  "../_generated/**/*",
  "!../index.ts",
  "!../convex.config.ts",
]);

describe("stores", () => {
  describe("getById", () => {
    it("returns store by id", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://teststore.com",
          isCrawling: false,
        });
      });

      const store = await t.query(api.stores.getById, { storeId });

      expect(store.name).toBe("Test Store");
      expect(store.url).toBe("https://teststore.com");
      expect(store.isCrawling).toBe(false);
    });

    it("throws on non-existent store", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        const id = await ctx.db.insert("stores", {
          name: "Temp",
          url: "https://temp.com",
          isCrawling: false,
        });
        await ctx.db.delete(id);
        return id;
      });

      await expect(t.query(api.stores.getById, { storeId })).rejects.toThrow();
    });
  });

  describe("deleteById", () => {
    it("deletes existing store", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "To Delete",
          url: "https://delete.com",
          isCrawling: false,
        });
      });

      await t.mutation(api.stores.deleteById, { storeId });

      const stores = await t.run(async (ctx) => {
        return await ctx.db.query("stores").collect();
      });
      expect(stores).toHaveLength(0);
    });

    it("throws when store not found", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        const id = await ctx.db.insert("stores", {
          name: "Temp",
          url: "https://temp.com",
          isCrawling: false,
        });
        await ctx.db.delete(id);
        return id;
      });

      await expect(t.mutation(api.stores.deleteById, { storeId })).rejects.toThrow("not found");
    });
  });
});
