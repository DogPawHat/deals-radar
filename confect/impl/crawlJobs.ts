import { FunctionImpl, GroupImpl } from "@confect/server";
import { MutationCtx } from "../_generated/services";
import { Effect, Layer } from "effect";
import type { GenericId } from "convex/values";

import api from "../_generated/api";

const CRAWL_INTERVAL_MS = 6 * 60 * 60 * 1000;
const COOLDOWN_MS = 3 * 60 * 1000;
const RETRY_BACKOFF_MS = [60_000, 240_000, 600_000] as const;
const MAX_JOBS_PER_MINUTE = 10;
const MAX_CONCURRENT_JOBS = 10;

const crawlTick = FunctionImpl.make(api, "crawlJobs", "crawlTick", () =>
  Effect.gen(function* () {
    const ctx = yield* MutationCtx;
    const now = Date.now();

    const recentJobs = yield* Effect.promise(() =>
      ctx.db
        .query("crawlJobs")
        .filter((q) => q.gte(q.field("enqueuedAt"), now - 60_000))
        .collect(),
    ).pipe(Effect.orDie);

    const queuedOrRunning = recentJobs.filter(
      (job) => job.status === "queued" || job.status === "running",
    );

    const runningJobs = yield* Effect.promise(() =>
      ctx.db
        .query("crawlJobs")
        .filter((q) => q.eq(q.field("status"), "running"))
        .collect(),
    ).pipe(Effect.orDie);

    const stores = yield* Effect.promise(() => ctx.db.query("stores").collect()).pipe(Effect.orDie);

    let processed = 0;
    let remainingRateLimit = Math.max(0, MAX_JOBS_PER_MINUTE - queuedOrRunning.length);
    let remainingConcurrentSlots = Math.max(0, MAX_CONCURRENT_JOBS - runningJobs.length);

    for (const store of stores) {
      if (remainingRateLimit <= 0 || remainingConcurrentSlots <= 0) {
        break;
      }

      const recentForStore = queuedOrRunning.filter((job) => job.storeId === store._id);

      if (store.isCrawling) {
        continue;
      }

      if (store.lastCrawlAt && now - store.lastCrawlAt < CRAWL_INTERVAL_MS) {
        continue;
      }

      if (recentForStore[0]?.status === "running") {
        continue;
      }

      if (
        recentForStore[0]?.status === "queued" &&
        recentForStore[0].enqueuedAt > now - COOLDOWN_MS
      ) {
        continue;
      }

      const failedJobs = yield* Effect.promise(() =>
        ctx.db
          .query("crawlJobs")
          .withIndex("by_storeId", (q) => q.eq("storeId", store._id))
          .filter((q) => q.eq(q.field("status"), "failed"))
          .collect(),
      ).pipe(Effect.orDie);

      const maxAttemptJob = failedJobs.reduce<(typeof failedJobs)[number] | undefined>(
        (max, job) => (max && job.attempt > max.attempt ? job : max),
        failedJobs[0],
      );

      if (!maxAttemptJob) {
        yield* Effect.promise(() => ctx.db.patch(store._id, { isCrawling: true })).pipe(
          Effect.orDie,
        );
        yield* Effect.promise(() =>
          ctx.db.insert("crawlJobs", {
            storeId: store._id,
            enqueuedAt: now,
            status: "queued",
            attempt: 1,
          }),
        ).pipe(Effect.orDie);
        processed += 1;
        remainingRateLimit -= 1;
        remainingConcurrentSlots -= 1;
        continue;
      }

      const maxAttempt = maxAttemptJob.attempt;
      if (maxAttempt >= 3) {
        continue;
      }

      const baseBackoff = RETRY_BACKOFF_MS[maxAttempt - 1];
      if (baseBackoff === undefined) {
        continue;
      }

      const backoffMs = Math.max(COOLDOWN_MS, baseBackoff);
      const lastFailedAt =
        maxAttemptJob.finishedAt ?? maxAttemptJob.startedAt ?? maxAttemptJob.enqueuedAt;

      if (now - lastFailedAt < backoffMs) {
        continue;
      }

      yield* Effect.promise(() => ctx.db.patch(store._id, { isCrawling: true })).pipe(Effect.orDie);
      yield* Effect.promise(() =>
        ctx.db.insert("crawlJobs", {
          storeId: store._id,
          enqueuedAt: now,
          status: "queued",
          attempt: maxAttempt + 1,
        }),
      ).pipe(Effect.orDie);

      processed += 1;
      remainingRateLimit -= 1;
      remainingConcurrentSlots -= 1;
    }

    return { processed };
  }),
);

const retryFailedJobs = FunctionImpl.make(api, "crawlJobs", "retryFailedJobs", () =>
  Effect.gen(function* () {
    const ctx = yield* MutationCtx;
    const now = Date.now();

    const failedJobs = yield* Effect.promise(() =>
      ctx.db
        .query("crawlJobs")
        .filter((q) => q.eq(q.field("status"), "failed"))
        .collect(),
    ).pipe(Effect.orDie);

    type StoreRetryInfo = {
      storeId: GenericId<"stores">;
      attempt: number;
      lastAttemptTime: number;
    };

    const storesToRetry = new Map<string, StoreRetryInfo>();

    for (const job of failedJobs) {
      const lastAttemptTime = job.finishedAt ?? job.startedAt ?? job.enqueuedAt;
      const key = job.storeId.toString();
      const existing = storesToRetry.get(key);

      if (!existing || job.attempt > existing.attempt) {
        storesToRetry.set(key, {
          storeId: job.storeId,
          attempt: job.attempt,
          lastAttemptTime,
        });
      }
    }

    let retriedCount = 0;

    for (const info of storesToRetry.values()) {
      if (info.attempt >= 3) {
        continue;
      }

      const backoffMs = RETRY_BACKOFF_MS[info.attempt - 1];
      if (backoffMs === undefined || now - info.lastAttemptTime < backoffMs) {
        continue;
      }

      const store = yield* Effect.promise(() => ctx.db.get(info.storeId)).pipe(Effect.orDie);
      if (!store || ("isCrawling" in store && store.isCrawling)) {
        continue;
      }

      yield* Effect.promise(() => ctx.db.patch(info.storeId, { isCrawling: true })).pipe(
        Effect.orDie,
      );
      yield* Effect.promise(() =>
        ctx.db.insert("crawlJobs", {
          storeId: info.storeId,
          enqueuedAt: now,
          status: "queued",
          attempt: info.attempt + 1,
        }),
      ).pipe(Effect.orDie);

      retriedCount += 1;
    }

    return { retriedCount };
  }),
);

export const crawlJobs = GroupImpl.make(api, "crawlJobs").pipe(
  Layer.provide(crawlTick),
  Layer.provide(retryFailedJobs),
);
