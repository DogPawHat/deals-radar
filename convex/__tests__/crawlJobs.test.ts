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

describe("crawlJobs", () => {
  describe("crawlTick", () => {
    it("returns 0 when no stores exist", async () => {
      const t = convexTest(schema, modules);
      const result = await t.mutation(api.crawlJobs.crawlTick, {});
      expect(result.processed).toBe(0);
    });

    it("enqueues crawl for store never crawled", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const result = await t.mutation(api.crawlJobs.crawlTick, {});
      expect(result.processed).toBe(1);

      const jobs = await t.run(async (ctx) => {
        return await ctx.db.query("crawlJobs").collect();
      });
      expect(jobs).toHaveLength(1);
      expect(jobs[0]!.status).toBe("queued");
      expect(jobs[0]!.attempt).toBe(1);
    });

    it("skips store crawled recently", async () => {
      const t = convexTest(schema, modules);

      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          lastCrawlAt: oneHourAgo,
          isCrawling: false,
        });
      });

      const result = await t.mutation(api.crawlJobs.crawlTick, {});
      expect(result.processed).toBe(0);
    });

    it("respects max jobs per minute limit", async () => {
      const t = convexTest(schema, modules);

      for (let i = 0; i < 15; i++) {
        await t.run(async (ctx) => {
          return await ctx.db.insert("stores", {
            name: `Store ${i}`,
            url: `https://test${i}.com`,
            isCrawling: false,
          });
        });
      }

      const result = await t.mutation(api.crawlJobs.crawlTick, {});
      expect(result.processed).toBe(10);
    });

    it("respects concurrent job limit", async () => {
      const t = convexTest(schema, modules);

      for (let i = 0; i < 3; i++) {
        await t.run(async (ctx) => {
          return await ctx.db.insert("stores", {
            name: `Store ${i}`,
            url: `https://test${i}.com`,
            isCrawling: false,
          });
        });
      }

      await t.mutation(api.crawlJobs.crawlTick, {});

      await t.run(async (ctx) => {
        const jobs = await ctx.db.query("crawlJobs").collect();
        for (let i = 0; i < 3; i++) {
          if (jobs[i]) {
            await ctx.db.patch(jobs[i]._id, { status: "running" });
          }
        }
      });

      for (let i = 3; i < 13; i++) {
        await t.run(async (ctx) => {
          return await ctx.db.insert("stores", {
            name: `Store ${i}`,
            url: `https://test${i}.com`,
            isCrawling: false,
          });
        });
      }

      const result = await t.mutation(api.crawlJobs.crawlTick, {});
      expect(result.processed).toBe(7);
    });

    it("retries failed jobs after backoff", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      await t.run(async (ctx) => {
        await ctx.db.insert("crawlJobs", {
          storeId,
          enqueuedAt: fiveMinutesAgo,
          startedAt: fiveMinutesAgo,
          finishedAt: fiveMinutesAgo,
          status: "failed",
          attempt: 1,
          errorDetails: "Test error",
        });
      });

      const result = await t.mutation(api.crawlJobs.crawlTick, {});
      expect(result.processed).toBe(1);

      const jobs = await t.run(async (ctx) => {
        return await ctx.db.query("crawlJobs").collect();
      });
      const retryJob = jobs.find((j) => j.attempt === 2);
      expect(retryJob).toBeDefined();
    });

    it("does not retry failed jobs before backoff", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      await t.run(async (ctx) => {
        await ctx.db.insert("crawlJobs", {
          storeId,
          enqueuedAt: twoMinutesAgo,
          startedAt: twoMinutesAgo,
          finishedAt: twoMinutesAgo,
          status: "failed",
          attempt: 1,
          errorDetails: "Test error",
        });
      });

      const result = await t.mutation(api.crawlJobs.crawlTick, {});
      expect(result.processed).toBe(0);
    });

    it("does not exceed max retry attempts", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      for (let i = 1; i <= 3; i++) {
        await t.run(async (ctx) => {
          await ctx.db.insert("crawlJobs", {
            storeId,
            enqueuedAt: fiveMinutesAgo - i * 1000,
            startedAt: fiveMinutesAgo - i * 1000,
            finishedAt: fiveMinutesAgo - i * 1000,
            status: "failed",
            attempt: i,
            errorDetails: `Error ${i}`,
          });
        });
      }

      const result = await t.mutation(api.crawlJobs.crawlTick, {});
      expect(result.processed).toBe(0);
    });

    it("marks store as crawling when enqueuing job", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      await t.mutation(api.crawlJobs.crawlTick, {});

      const store = await t.run(async (ctx) => {
        return await ctx.db.get(storeId);
      });
      expect(store?.isCrawling).toBe(true);
    });
  });

  describe("retryFailedJobs", () => {
    it("retries jobs after backoff period", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      await t.run(async (ctx) => {
        await ctx.db.insert("crawlJobs", {
          storeId,
          enqueuedAt: fiveMinutesAgo,
          startedAt: fiveMinutesAgo,
          finishedAt: fiveMinutesAgo,
          status: "failed",
          attempt: 1,
          errorDetails: "Test error",
        });
      });

      const result = await t.mutation(api.crawlJobs.retryFailedJobs, {});
      expect(result.retriedCount).toBe(1);

      const jobs = await t.run(async (ctx) => {
        return await ctx.db.query("crawlJobs").collect();
      });
      expect(jobs.filter((j) => j.attempt === 2)).toHaveLength(1);
    });

    it("does not retry before backoff", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const thirtySecondsAgo = Date.now() - 30 * 1000;
      await t.run(async (ctx) => {
        await ctx.db.insert("crawlJobs", {
          storeId,
          enqueuedAt: thirtySecondsAgo,
          startedAt: thirtySecondsAgo,
          finishedAt: thirtySecondsAgo,
          status: "failed",
          attempt: 1,
          errorDetails: "Test error",
        });
      });

      const result = await t.mutation(api.crawlJobs.retryFailedJobs, {});
      expect(result.retriedCount).toBe(0);
    });

    it("does not retry if store is crawling", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: true,
        });
      });

      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      await t.run(async (ctx) => {
        await ctx.db.insert("crawlJobs", {
          storeId,
          enqueuedAt: fiveMinutesAgo,
          startedAt: fiveMinutesAgo,
          finishedAt: fiveMinutesAgo,
          status: "failed",
          attempt: 1,
          errorDetails: "Test error",
        });
      });

      const result = await t.mutation(api.crawlJobs.retryFailedJobs, {});
      expect(result.retriedCount).toBe(0);
    });

    it("does not retry if max attempts exceeded", async () => {
      const t = convexTest(schema, modules);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      for (let i = 1; i <= 3; i++) {
        await t.run(async (ctx) => {
          await ctx.db.insert("crawlJobs", {
            storeId,
            enqueuedAt: tenMinutesAgo - i * 1000,
            startedAt: tenMinutesAgo - i * 1000,
            finishedAt: tenMinutesAgo - i * 1000,
            status: "failed",
            attempt: i,
            errorDetails: `Error ${i}`,
          });
        });
      }

      const result = await t.mutation(api.crawlJobs.retryFailedJobs, {});
      expect(result.retriedCount).toBe(0);
    });
  });
});
