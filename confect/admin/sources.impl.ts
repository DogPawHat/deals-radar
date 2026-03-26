import { FunctionImpl, GroupImpl } from "@confect/server";
import { makeFunctionReference } from "convex/server";
import {
  ActionCtx,
  DatabaseReader,
  DatabaseWriter,
  MutationCtx,
  Scheduler,
} from "../_generated/services";
import { Duration, Effect, Layer } from "effect";

import api from "../_generated/api";
import { fetchAndParseRobotsTxt } from "../lib/robots";

const COOLDOWN_MS = 3 * 60 * 1000;
const refreshStoreRobotsRulesAction = makeFunctionReference<
  "action",
  { storeId: string; url: string },
  null
>("admin/sources:refreshStoreRobotsRules");
const updateStoreRobotsRulesMutation = makeFunctionReference<
  "mutation",
  { storeId: string; robotsRules?: string },
  null
>("admin/sources:updateStoreRobotsRules");

const listStores = FunctionImpl.make(api, "admin.sources", "listStores", () =>
  Effect.gen(function* () {
    const reader = yield* DatabaseReader;

    const stores = yield* reader
      .table("stores")
      .index("by_creation_time")
      .collect()
      .pipe(Effect.orDie);
    const storesWithStats = [] as Array<{
      _id: (typeof stores)[number]["_id"];
      name: string;
      url: string;
      lastCrawlAt?: number;
      isCrawling: boolean;
      robotsRules?: string;
      dealCount: number;
      lastJobStatus?: "queued" | "running" | "done" | "failed";
      lastJobAt?: number;
    }>;

    for (const store of stores) {
      const deals = yield* reader
        .table("deals")
        .index("by_storeId", (q) => q.eq("storeId", store._id))
        .collect()
        .pipe(Effect.orDie);

      const jobs = yield* reader
        .table("crawlJobs")
        .index("by_storeId", (q) => q.eq("storeId", store._id))
        .collect()
        .pipe(Effect.orDie);

      const sortedJobs = [...jobs].sort((a, b) => b.enqueuedAt - a.enqueuedAt);
      const lastJob = sortedJobs[0];

      storesWithStats.push({
        _id: store._id,
        name: store.name,
        url: store.url,
        lastCrawlAt: store.lastCrawlAt,
        isCrawling: store.isCrawling,
        robotsRules: store.robotsRules,
        dealCount: deals.length,
        lastJobStatus: lastJob?.status,
        lastJobAt: lastJob?.finishedAt ?? lastJob?.startedAt ?? lastJob?.enqueuedAt,
      });
    }

    return storesWithStats;
  }),
);

const updateStoreRobotsRules = FunctionImpl.make(
  api,
  "admin.sources",
  "updateStoreRobotsRules",
  ({ robotsRules, storeId }) =>
    Effect.gen(function* () {
      const writer = yield* DatabaseWriter;
      yield* writer.table("stores").patch(storeId, { robotsRules }).pipe(Effect.orDie);
      return null;
    }),
);

const refreshStoreRobotsRules = FunctionImpl.make(
  api,
  "admin.sources",
  "refreshStoreRobotsRules",
  ({ storeId, url }) =>
    Effect.gen(function* () {
      const ctx = yield* ActionCtx;
      let robotsRules: string | undefined;

      try {
        const result = yield* fetchAndParseRobotsTxt(url.trim()).pipe(Effect.orDie);
        const lines = result.rules.map((rule) =>
          rule.allow ? `Allow: ${rule.allow}` : `Disallow: ${rule.disallow}`,
        );
        robotsRules = lines.join("\n");
      } catch {
        robotsRules = undefined;
      }

      yield* Effect.promise(() =>
        ctx.runMutation(updateStoreRobotsRulesMutation, {
          storeId,
          robotsRules,
        }),
      ).pipe(Effect.orDie);

      return null;
    }),
);

const createStore = FunctionImpl.make(api, "admin.sources", "createStore", ({ name, url }) =>
  Effect.gen(function* () {
    const db = yield* DatabaseWriter;
    const scheduler = yield* Scheduler;
    const trimmedUrl = url.trim();

    const storeId = yield* db
      .table("stores")
      .insert({
        name: name.trim(),
        url: trimmedUrl,
        isCrawling: false,
      })
      .pipe(Effect.orDie);

    yield* scheduler
      .runAfter(Duration.millis(0), refreshStoreRobotsRulesAction, { storeId, url: trimmedUrl })
      .pipe(Effect.orDie);

    return { storeId };
  }),
);

const runNow = FunctionImpl.make(api, "admin.sources", "runNow", ({ storeId }) =>
  Effect.gen(function* () {
    const ctx = yield* MutationCtx;
    const now = Date.now();

    const recentJobs = yield* Effect.promise(() =>
      ctx.db
        .query("crawlJobs")
        .filter((q) =>
          q.and(q.eq(q.field("storeId"), storeId), q.gte(q.field("enqueuedAt"), now - COOLDOWN_MS)),
        )
        .collect(),
    ).pipe(Effect.orDie);

    const queuedOrRunning = recentJobs.filter(
      (job) => job.status === "queued" || job.status === "running",
    );

    if (queuedOrRunning.length > 0) {
      const oldestJob = queuedOrRunning.reduce((min, job) =>
        job.enqueuedAt < min.enqueuedAt ? job : min,
      );
      const cooldownRemainingMs = COOLDOWN_MS - (now - oldestJob.enqueuedAt);

      return {
        success: false,
        cooldownRemainingMs: Math.max(0, cooldownRemainingMs),
        message: "Crawl already in progress or recently enqueued",
      };
    }

    const store = yield* Effect.promise(() => ctx.db.get(storeId)).pipe(Effect.orDie);
    if (!store) {
      return yield* Effect.die(new Error(`Store ${storeId} not found`));
    }

    if (store.isCrawling) {
      return {
        success: false,
        cooldownRemainingMs: 0,
        message: "Store is currently crawling",
      };
    }

    yield* Effect.promise(() => ctx.db.patch(storeId, { isCrawling: true })).pipe(Effect.orDie);
    yield* Effect.promise(() =>
      ctx.db.insert("crawlJobs", {
        storeId,
        enqueuedAt: now,
        status: "queued",
        attempt: 1,
      }),
    ).pipe(Effect.orDie);

    return {
      success: true,
      cooldownRemainingMs: 0,
      message: "Crawl job enqueued",
    };
  }),
);

const getStore = FunctionImpl.make(api, "admin.sources", "getStore", ({ storeId }) =>
  Effect.gen(function* () {
    const reader = yield* DatabaseReader;

    const store = yield* reader.table("stores").get(storeId).pipe(Effect.orDie);
    const jobs = yield* reader
      .table("crawlJobs")
      .index("by_storeId", (q) => q.eq("storeId", storeId))
      .collect()
      .pipe(Effect.orDie);

    return {
      store: {
        _id: store._id,
        name: store.name,
        url: store.url,
        lastCrawlAt: store.lastCrawlAt,
        isCrawling: store.isCrawling,
        robotsRules: store.robotsRules,
      },
      recentJobs: [...jobs].sort((a, b) => b.enqueuedAt - a.enqueuedAt).slice(0, 10),
    };
  }),
);

const updateStore = FunctionImpl.make(
  api,
  "admin.sources",
  "updateStore",
  ({ name, storeId, url }) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const writer = yield* DatabaseWriter;
      const scheduler = yield* Scheduler;
      const trimmedUrl = url.trim();

      yield* reader.table("stores").get(storeId).pipe(Effect.orDie);

      yield* writer
        .table("stores")
        .patch(storeId, {
          name: name.trim(),
          url: trimmedUrl,
          robotsRules: undefined,
        })
        .pipe(Effect.orDie);

      yield* scheduler
        .runAfter(Duration.millis(0), refreshStoreRobotsRulesAction, {
          storeId,
          url: trimmedUrl,
        })
        .pipe(Effect.orDie);

      return { success: true };
    }),
);

const deleteStore = FunctionImpl.make(api, "admin.sources", "deleteStore", ({ storeId }) =>
  Effect.gen(function* () {
    const db = yield* DatabaseWriter;
    yield* db.table("stores").delete(storeId);
    return { success: true };
  }),
);

export const sources = GroupImpl.make(api, "admin.sources").pipe(
  Layer.provide(listStores),
  Layer.provide(updateStoreRobotsRules),
  Layer.provide(refreshStoreRobotsRules),
  Layer.provide(createStore),
  Layer.provide(runNow),
  Layer.provide(getStore),
  Layer.provide(updateStore),
  Layer.provide(deleteStore),
);
