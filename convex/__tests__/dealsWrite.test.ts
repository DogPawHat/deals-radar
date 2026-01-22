import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { internal } from "../_generated/api";
import { DealExtraction } from "../eSchemas";

const modules = import.meta.glob([
  "../**/*.ts",
  "../_generated/**/*",
  "!../index.ts",
  "!../convex.config.ts",
]);

describe("deals write pipeline", () => {
  describe("updateDealsForStore", () => {
    it("inserts new deal when no existing deal exists", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const deals: (typeof DealExtraction.Type)[] = [
        {
          title: "New Deal",
          url: "https://test.com/deal1",
          price: 80,
          currency: "USD",
          msrp: 100,
          image: "https://test.com/image.jpg",
          percentOff: 20,
        },
      ];

      await t.mutation(internal.crawls.updateDealsForStore, { storeId, deals });

      const storedDeals = await t.run(async (ctx) => {
        return await ctx.db
          .query("deals")
          .withIndex("by_storeId", (q) => q.eq("storeId", storeId))
          .collect();
      });

      expect(storedDeals).toHaveLength(1);
      expect(storedDeals[0]?.title).toBe("New Deal");
      expect(storedDeals[0]?.price).toBe(80);
      expect(storedDeals[0]?.percentOff).toBe(20);
      expect(storedDeals[0]?.image).toBe("https://test.com/image.jpg");
    });

    it("updates existing deal when dedup key matches", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const dealUrl = "https://test.com/deal1";
      const dealTitle = "Test Deal";

      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: dealTitle,
            url: dealUrl,
            price: 100,
            currency: "USD",
            percentOff: 0,
          },
        ],
      });

      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: dealTitle,
            url: dealUrl,
            price: 80,
            currency: "USD",
            msrp: 100,
            percentOff: 20,
          },
        ],
      });

      const storedDeals = await t.run(async (ctx) => {
        return await ctx.db
          .query("deals")
          .withIndex("by_storeId", (q) => q.eq("storeId", storeId))
          .collect();
      });

      expect(storedDeals).toHaveLength(1);
      expect(storedDeals[0]?.title).toBe("Test Deal");
      expect(storedDeals[0]?.price).toBe(80);
      expect(storedDeals[0]?.percentOff).toBe(20);
    });

    it("appends price history entry for new deal", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const now = Date.now();
      const deals: (typeof DealExtraction.Type)[] = [
        {
          title: "Deal With History",
          url: "https://test.com/deal-history",
          price: 75,
          currency: "USD",
          msrp: 100,
          percentOff: 25,
        },
      ];

      await t.mutation(internal.crawls.updateDealsForStore, { storeId, deals });

      const storedDeals = await t.run(async (ctx) => {
        return await ctx.db
          .query("deals")
          .withIndex("by_storeId", (q) => q.eq("storeId", storeId))
          .collect();
      });

      const priceHistory = await t.run(async (ctx) => {
        return await ctx.db.query("priceHistory").collect();
      });

      expect(priceHistory).toHaveLength(1);
      expect(priceHistory[0]?.dealId).toBe(storedDeals[0]?._id);
      expect(priceHistory[0]?.price).toBe(75);
      expect(priceHistory[0]?.at).toBeGreaterThan(now - 1000);
    });

    it("appends price history entry for updated deal with new price", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const dealUrl = "https://test.com/deal-existing";
      const dealTitle = "Existing Deal";

      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: dealTitle,
            url: dealUrl,
            price: 90,
            currency: "USD",
            percentOff: 10,
          },
        ],
      });

      const dealId = await t.run(async (ctx) => {
        const deals = await ctx.db.query("deals").collect();
        return deals[0]!._id;
      });

      const now = Date.now();
      await t.run(async (ctx) => {
        await ctx.db.insert("priceHistory", {
          dealId,
          price: 90,
          at: now - 60000,
        });
      });

      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: dealTitle,
            url: dealUrl,
            price: 70,
            currency: "USD",
            msrp: 100,
            percentOff: 30,
          },
        ],
      });

      const storedDeals = await t.run(async (ctx) => {
        return await ctx.db.query("deals").collect();
      });

      const priceHistory = await t.run(async (ctx) => {
        return await ctx.db
          .query("priceHistory")
          .withIndex("by_dealId", (q) => q.eq("dealId", dealId))
          .collect();
      });

      expect(storedDeals[0]?.price).toBe(70);
      expect(priceHistory).toHaveLength(3);
      expect(priceHistory[2]?.price).toBe(70);
      expect(priceHistory[2]?.at).toBeGreaterThan(now - 1000);
    });

    it("does not append price history when price unchanged", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const dealId = await t.run(async (ctx) => {
        return await ctx.db.insert("deals", {
          storeId,
          title: "Stable Deal",
          url: "https://test.com/deal-stable",
          canonicalUrl: "https://test.com/deal-stable",
          dedupKey: "stable-key",
          price: 50,
          currency: "USD",
          percentOff: 50,
        });
      });

      const now = Date.now();
      await t.run(async (ctx) => {
        await ctx.db.insert("priceHistory", {
          dealId,
          price: 50,
          at: now - 60000,
        });
      });

      const deals: (typeof DealExtraction.Type)[] = [
        {
          title: "Stable Deal",
          url: "https://test.com/deal-stable",
          price: 50,
          currency: "USD",
          percentOff: 50,
        },
      ];

      await t.mutation(internal.crawls.updateDealsForStore, { storeId, deals });

      const priceHistory = await t.run(async (ctx) => {
        return await ctx.db
          .query("priceHistory")
          .withIndex("by_dealId", (q) => q.eq("dealId", dealId))
          .collect();
      });

      expect(priceHistory).toHaveLength(1);
    });

    it("handles multiple deals in single call", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const deals: (typeof DealExtraction.Type)[] = [
        {
          title: "Deal 1",
          url: "https://test.com/deal1",
          price: 10,
          currency: "USD",
          percentOff: 50,
        },
        {
          title: "Deal 2",
          url: "https://test.com/deal2",
          price: 20,
          currency: "USD",
          msrp: 30,
          percentOff: 33,
        },
        {
          title: "Deal 3",
          url: "https://test.com/deal3",
          price: 30,
          currency: "USD",
          percentOff: 25,
        },
      ];

      await t.mutation(internal.crawls.updateDealsForStore, { storeId, deals });

      const storedDeals = await t.run(async (ctx) => {
        return await ctx.db
          .query("deals")
          .withIndex("by_storeId", (q) => q.eq("storeId", storeId))
          .collect();
      });

      const priceHistory = await t.run(async (ctx) => {
        return await ctx.db.query("priceHistory").collect();
      });

      expect(storedDeals).toHaveLength(3);
      expect(priceHistory).toHaveLength(3);
    });

    it("writes all deals regardless of discount percentage (filtering done at query time)", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const deals: (typeof DealExtraction.Type)[] = [
        {
          title: "Good Deal",
          url: "https://test.com/good-deal",
          price: 85,
          currency: "USD",
          msrp: 100,
          percentOff: 15,
        },
        {
          title: "Bad Deal",
          url: "https://test.com/bad-deal",
          price: 99,
          currency: "USD",
          msrp: 100,
          percentOff: 1,
        },
        {
          title: "No Discount",
          url: "https://test.com/no-discount",
          price: 50,
          currency: "USD",
          percentOff: 0,
        },
      ];

      await t.mutation(internal.crawls.updateDealsForStore, { storeId, deals });

      const storedDeals = await t.run(async (ctx) => {
        return await ctx.db
          .query("deals")
          .withIndex("by_storeId", (q) => q.eq("storeId", storeId))
          .collect();
      });

      expect(storedDeals).toHaveLength(3);
      const goodDeal = storedDeals.find((d) => d.title === "Good Deal");
      const badDeal = storedDeals.find((d) => d.title === "Bad Deal");
      const noDiscountDeal = storedDeals.find((d) => d.title === "No Discount");

      expect(goodDeal?.percentOff).toBe(15);
      expect(badDeal?.percentOff).toBe(1);
      expect(noDiscountDeal?.percentOff).toBe(0);
    });

    it("handles deals without msrp", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const deals: (typeof DealExtraction.Type)[] = [
        {
          title: "No MSRP Deal",
          url: "https://test.com/no-msrp",
          price: 50,
          currency: "USD",
          percentOff: 0,
        },
      ];

      await t.mutation(internal.crawls.updateDealsForStore, { storeId, deals });

      const storedDeals = await t.run(async (ctx) => {
        return await ctx.db.query("deals").collect();
      });

      expect(storedDeals).toHaveLength(1);
      expect(storedDeals[0]?.percentOff).toBe(0);
      expect(storedDeals[0]?.msrp).toBeUndefined();
    });
  });
});

describe("priceHistory", () => {
  describe("getPriceHistory", () => {
    it("returns price history for deal", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const dealId = await t.run(async (ctx) => {
        return await ctx.db.insert("deals", {
          storeId,
          title: "Test Deal",
          url: "https://test.com/deal",
          canonicalUrl: "https://test.com/deal",
          dedupKey: "test-key",
          price: 50,
          currency: "USD",
          percentOff: 0,
        });
      });

      const now = Date.now();
      await t.run(async (ctx) => {
        await ctx.db.insert("priceHistory", { dealId, price: 60, at: now - 86400000 });
        await ctx.db.insert("priceHistory", { dealId, price: 55, at: now - 43200000 });
        await ctx.db.insert("priceHistory", { dealId, price: 50, at: now });
      });

      const priceHistory = await t.run(async (ctx) => {
        return await ctx.db
          .query("priceHistory")
          .withIndex("by_dealId", (q) => q.eq("dealId", dealId))
          .collect();
      });

      expect(priceHistory).toHaveLength(3);
      expect(priceHistory[0]?.price).toBe(60);
      expect(priceHistory[1]?.price).toBe(55);
      expect(priceHistory[2]?.price).toBe(50);
    });
  });
});
