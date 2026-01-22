import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob([
  "../**/*.ts",
  "../_generated/**/*",
  "!../index.ts",
  "!../convex.config.ts",
]);

describe("public deals queries", () => {
  describe("getDealsNewest", () => {
    it("returns deals sorted by creation time (newest first)", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("deals", {
          storeId,
          title: "Deal 1",
          url: "https://test.com/deal1",
          canonicalUrl: "https://test.com/deal1",
          dedupKey: "key1",
          price: 10,
          currency: "USD",
          percentOff: 10,
        });
        await ctx.db.insert("deals", {
          storeId,
          title: "Deal 2",
          url: "https://test.com/deal2",
          canonicalUrl: "https://test.com/deal2",
          dedupKey: "key2",
          price: 20,
          currency: "USD",
          percentOff: 20,
        });
        await ctx.db.insert("deals", {
          storeId,
          title: "Deal 3",
          url: "https://test.com/deal3",
          canonicalUrl: "https://test.com/deal3",
          dedupKey: "key3",
          price: 30,
          currency: "USD",
          percentOff: 30,
        });
      });

      const result = await t.query(api.publicDeals.getDealsNewest, { limit: 10 });

      expect(result.deals).toHaveLength(3);
      expect(result.deals[0]?.title).toBe("Deal 3");
      expect(result.deals[1]?.title).toBe("Deal 2");
      expect(result.deals[2]?.title).toBe("Deal 1");
    });

    it("filters out deals with less than 5% discount", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("deals", {
          storeId,
          title: "Deal 1",
          url: "https://test.com/deal1",
          canonicalUrl: "https://test.com/deal1",
          dedupKey: "key1",
          price: 10,
          currency: "USD",
          percentOff: 10,
        });
        await ctx.db.insert("deals", {
          storeId,
          title: "Deal 2",
          url: "https://test.com/deal2",
          canonicalUrl: "https://test.com/deal2",
          dedupKey: "key2",
          price: 20,
          currency: "USD",
          percentOff: 3,
        });
        await ctx.db.insert("deals", {
          storeId,
          title: "Deal 3",
          url: "https://test.com/deal3",
          canonicalUrl: "https://test.com/deal3",
          dedupKey: "key3",
          price: 30,
          currency: "USD",
          percentOff: 50,
        });
      });

      const result = await t.query(api.publicDeals.getDealsNewest, { limit: 10 });

      expect(result.deals).toHaveLength(2);
      expect(
        result.deals.find((d: (typeof result.deals)[0]) => d.title === "Deal 2"),
      ).toBeUndefined();
    });

    it("respects limit parameter", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      await t.run(async (ctx) => {
        for (let i = 0; i < 5; i++) {
          await ctx.db.insert("deals", {
            storeId,
            title: `Deal ${i}`,
            url: `https://test.com/deal${i}`,
            canonicalUrl: `https://test.com/deal${i}`,
            dedupKey: `key${i}`,
            price: 10 + i,
            currency: "USD",
            percentOff: 10 + i,
          });
        }
      });

      const result = await t.query(api.publicDeals.getDealsNewest, { limit: 2 });

      expect(result.deals).toHaveLength(2);
    });

    it("returns empty array when no deals exist", async () => {
      const t = convexTest(schema, modules);

      await t.run(async (ctx) => {
        await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const result = await t.query(api.publicDeals.getDealsNewest, { limit: 10 });

      expect(result.deals).toHaveLength(0);
    });
  });

  describe("getDealsBiggestDrop", () => {
    it("returns deals sorted by percentOff (highest first)", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("deals", {
          storeId,
          title: "Deal 1",
          url: "https://test.com/deal1",
          canonicalUrl: "https://test.com/deal1",
          dedupKey: "key1",
          price: 10,
          currency: "USD",
          percentOff: 10,
        });
        await ctx.db.insert("deals", {
          storeId,
          title: "Deal 2",
          url: "https://test.com/deal2",
          canonicalUrl: "https://test.com/deal2",
          dedupKey: "key2",
          price: 20,
          currency: "USD",
          percentOff: 50,
        });
        await ctx.db.insert("deals", {
          storeId,
          title: "Deal 3",
          url: "https://test.com/deal3",
          canonicalUrl: "https://test.com/deal3",
          dedupKey: "key3",
          price: 30,
          currency: "USD",
          percentOff: 30,
        });
      });

      const result = await t.query(api.publicDeals.getDealsBiggestDrop, { limit: 10 });

      expect(result.deals).toHaveLength(3);
      expect(result.deals[0]?.title).toBe("Deal 2");
      expect(result.deals[1]?.title).toBe("Deal 3");
      expect(result.deals[2]?.title).toBe("Deal 1");
    });
  });

  describe("getDealsByPrice", () => {
    it("returns deals sorted by price (lowest first)", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("deals", {
          storeId,
          title: "Deal 1",
          url: "https://test.com/deal1",
          canonicalUrl: "https://test.com/deal1",
          dedupKey: "key1",
          price: 100,
          currency: "USD",
          percentOff: 10,
        });
        await ctx.db.insert("deals", {
          storeId,
          title: "Deal 2",
          url: "https://test.com/deal2",
          canonicalUrl: "https://test.com/deal2",
          dedupKey: "key2",
          price: 50,
          currency: "USD",
          percentOff: 20,
        });
        await ctx.db.insert("deals", {
          storeId,
          title: "Deal 3",
          url: "https://test.com/deal3",
          canonicalUrl: "https://test.com/deal3",
          dedupKey: "key3",
          price: 75,
          currency: "USD",
          percentOff: 30,
        });
      });

      const result = await t.query(api.publicDeals.getDealsByPrice, { limit: 10 });

      expect(result.deals).toHaveLength(3);
      expect(result.deals[0]?.title).toBe("Deal 2");
      expect(result.deals[1]?.title).toBe("Deal 3");
      expect(result.deals[2]?.title).toBe("Deal 1");
    });
  });

  describe("getDealsAll", () => {
    it("returns deals without specific sorting", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("deals", {
          storeId,
          title: "Deal 1",
          url: "https://test.com/deal1",
          canonicalUrl: "https://test.com/deal1",
          dedupKey: "key1",
          price: 100,
          currency: "USD",
          percentOff: 10,
        });
        await ctx.db.insert("deals", {
          storeId,
          title: "Deal 2",
          url: "https://test.com/deal2",
          canonicalUrl: "https://test.com/deal2",
          dedupKey: "key2",
          price: 50,
          currency: "USD",
          percentOff: 20,
        });
      });

      const result = await t.query(api.publicDeals.getDealsAll, { limit: 10 });

      expect(result.deals).toHaveLength(2);
    });
  });
});
