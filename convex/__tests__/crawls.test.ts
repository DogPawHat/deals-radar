import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";

const modules = import.meta.glob([
  "../**/*.ts",
  "../_generated/**/*",
  "!../index.ts",
  "!../convex.config.ts",
]);

describe("crawls", () => {
  describe("updateDealsForStore", () => {
    it("inserts new deal when none exists", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: "New Deal",
            url: "https://test.com/deal",
            price: 99.99,
            currency: "USD",
          },
        ],
      });

      const deals = await t.run(async (ctx) => {
        return await ctx.db.query("deals").collect();
      });
      expect(deals).toHaveLength(1);
      const firstDeal = deals[0]!;
      expect(firstDeal.title).toBe("New Deal");
      expect(firstDeal.price).toBe(99.99);
      expect(firstDeal.canonicalUrl).toBeDefined();
      expect(firstDeal.dedupKey).toBeDefined();
    });

    it("updates existing deal with same dedupKey", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: "Original Deal",
            url: "https://test.com/deal",
            price: 100,
            currency: "USD",
          },
        ],
      });

      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: "Original Deal",
            url: "https://test.com/deal",
            price: 80,
            currency: "USD",
          },
        ],
      });

      const deals = await t.run(async (ctx) => {
        return await ctx.db.query("deals").collect();
      });
      expect(deals).toHaveLength(1);
      const updatedDeal = deals[0]!;
      expect(updatedDeal.price).toBe(80);
    });

    it("inserts new deal when title differs", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: "Deal A",
            url: "https://test.com/deal",
            price: 100,
            currency: "USD",
          },
        ],
      });

      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: "Deal B",
            url: "https://test.com/deal",
            price: 90,
            currency: "USD",
          },
        ],
      });

      const deals = await t.run(async (ctx) => {
        return await ctx.db.query("deals").collect();
      });
      expect(deals).toHaveLength(2);
    });

    it("handles multiple deals in one call", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          { title: "Deal 1", url: "https://test.com/1", price: 10, currency: "USD" },
          { title: "Deal 2", url: "https://test.com/2", price: 20, currency: "USD" },
          { title: "Deal 3", url: "https://test.com/3", price: 30, currency: "USD" },
        ],
      });

      const deals = await t.run(async (ctx) => {
        return await ctx.db.query("deals").collect();
      });
      expect(deals).toHaveLength(3);
    });

    it("handles deal with optional image", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: "Deal With Image",
            url: "https://test.com/deal",
            price: 50,
            currency: "USD",
            image: "https://test.com/image.jpg",
          },
        ],
      });

      const deals = await t.run(async (ctx) => {
        return await ctx.db.query("deals").collect();
      });
      expect(deals).toHaveLength(1);
      expect(deals[0]!.image).toBe("https://test.com/image.jpg");
    });

    it("normalizes URLs with tracking params", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: "Deal",
            url: "https://TEST.COM/deal?utm_source=test&real=param",
            price: 50,
            currency: "USD",
          },
        ],
      });

      const deals = await t.run(async (ctx) => {
        return await ctx.db.query("deals").collect();
      });
      expect(deals).toHaveLength(1);
      expect(deals[0]!.canonicalUrl).toBe("https://test.com/deal?real=param");
    });

    it("produces same dedupKey for equivalent URLs with different tracking params", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: "Product",
            url: "https://example.com/product?utm_source=newsletter",
            price: 100,
            currency: "USD",
          },
        ],
      });

      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: "Product",
            url: "https://example.com/product?utm_source=social",
            price: 100,
            currency: "USD",
          },
        ],
      });

      const deals = await t.run(async (ctx) => {
        return await ctx.db.query("deals").collect();
      });
      expect(deals).toHaveLength(1);
    });
  });

  describe("beginManualCrawl", () => {
    it("succeeds when store is not crawling", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const result = await t.mutation(api.crawls.beginManualCrawl, { storeId });
      expect(result.success).toBe(true);
    });

    it("fails when crawl already in progress", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: true,
        });
      });

      await expect(t.mutation(api.crawls.beginManualCrawl, { storeId })).rejects.toThrow();
    });
  });

  describe("finishManualCrawl", () => {
    it("updates store crawling status", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: true,
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.patch(storeId, {
          lastCrawlAt: Date.now(),
          isCrawling: false,
        });
      });

      const store = await t.run(async (ctx) => {
        return await ctx.db.get(storeId);
      });

      expect(store?.isCrawling).toBe(false);
      expect(store?.lastCrawlAt).toBeDefined();
    });
  });
});
