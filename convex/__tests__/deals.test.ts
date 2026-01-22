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

describe("deals", () => {
  describe("getDealsForStore", () => {
    it("returns empty array when no deals exist", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Empty Store",
          url: "https://empty.com",
          isCrawling: false,
        });
      });

      const deals = await t.query(api.deals.getDealsForStore, { storeId });

      expect(deals).toHaveLength(0);
    });

    it("returns deals for specific store", async () => {
      const t = convexTest(schema, modules);

      const { storeId1, storeId2 } = await t.run(async (ctx) => {
        const id1 = await ctx.db.insert("stores", {
          name: "Store 1",
          url: "https://store1.com",
          isCrawling: false,
        });
        const id2 = await ctx.db.insert("stores", {
          name: "Store 2",
          url: "https://store2.com",
          isCrawling: false,
        });

        await ctx.db.insert("deals", {
          storeId: id1,
          title: "Deal 1",
          url: "https://store1.com/deal1",
          canonicalUrl: "https://store1.com/deal1",
          dedupKey: "key1",
          price: 10,
          currency: "USD",
          percentOff: 10,
        });
        await ctx.db.insert("deals", {
          storeId: id1,
          title: "Deal 2",
          url: "https://store1.com/deal2",
          canonicalUrl: "https://store1.com/deal2",
          dedupKey: "key2",
          price: 20,
          currency: "USD",
          percentOff: 20,
        });

        await ctx.db.insert("deals", {
          storeId: id2,
          title: "Deal 3",
          url: "https://store2.com/deal3",
          canonicalUrl: "https://store2.com/deal3",
          dedupKey: "key3",
          price: 30,
          currency: "USD",
          percentOff: 30,
        });

        return { storeId1: id1, storeId2: id2 };
      });

      const dealsStore1 = await t.query(api.deals.getDealsForStore, {
        storeId: storeId1,
      });
      const dealsStore2 = await t.query(api.deals.getDealsForStore, {
        storeId: storeId2,
      });

      expect(dealsStore1).toHaveLength(2);
      expect(dealsStore2).toHaveLength(1);
      expect(dealsStore2[0]?.title).toBe("Deal 3");
    });

    it("returns deals with all fields", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        const id = await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });

        await ctx.db.insert("deals", {
          storeId: id,
          title: "Full Deal",
          url: "https://test.com/deal",
          canonicalUrl: "https://test.com/deal",
          dedupKey: "fullkey",
          price: 99.99,
          currency: "USD",
          image: "https://test.com/image.jpg",
          msrp: 149.99,
          percentOff: 33,
        });

        return id;
      });

      const deals = await t.query(api.deals.getDealsForStore, { storeId });

      expect(deals).toHaveLength(1);
      expect(deals[0]).toBeDefined();
      const deal = deals[0]!;
      expect(deal.title).toBe("Full Deal");
      expect(deal.price).toBe(99.99);
      expect(deal.msrp).toBe(149.99);
      expect(deal.image).toBe("https://test.com/image.jpg");
    });
  });
});
