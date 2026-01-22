import { Effect, Schema, Option } from "effect";
import { mutation, internalMutation, ConfectMutationCtx } from "./confect";
import { Id } from "@rjdallecese/confect/server";

const CRAWL_INTERVAL_MS = 6 * 60 * 60 * 1000;
const COOLDOWN_MS = 3 * 60 * 1000;
const MAX_CONCURRENT_JOBS = 3;
const MAX_JOBS_PER_MINUTE = 10;
const RETRY_BACKOFF_MS = [60_000, 240_000, 600_000] as const;

class CrawlTickArgs extends Schema.Class<CrawlTickArgs>("CrawlTickArgs")({}) {}

class CrawlTickResult extends Schema.Class<CrawlTickResult>("CrawlTickResult")({
  processed: Schema.Number,
}) {}

export const crawlTick = mutation({
  args: CrawlTickArgs,
  returns: CrawlTickResult,
  handler: Effect.fn("crawlTick")(function* () {
    const { db } = yield* ConfectMutationCtx;
    const now = Date.now();

    const recentJobs = yield* db
      .query("crawlJobs")
      .filter((q) => q.gte(q.field("enqueuedAt"), now - 60_000))
      .collect();

    const queuedOrRunning = recentJobs.filter(
      (j) => j.status === "queued" || j.status === "running",
    );

    const stores = yield* db.query("stores").collect();

    let processed = 0;
    let newlyEnqueued = 0;

    for (const store of stores) {
      const recentForStore = queuedOrRunning.filter((j) => j.storeId === store._id);

      if (store.isCrawling) continue;

      if (store.lastCrawlAt && now - store.lastCrawlAt < CRAWL_INTERVAL_MS) continue;

      if (recentForStore.length > 0 && recentForStore[0]!.status === "running") continue;

      if (
        recentForStore.length > 0 &&
        recentForStore[0]!.status === "queued" &&
        recentForStore[0]!.enqueuedAt > now - COOLDOWN_MS
      )
        continue;

      const failedJobs = yield* db
        .query("crawlJobs")
        .withIndex("by_storeId", (q) => q.eq("storeId", store._id))
        .filter((q) => q.eq(q.field("status"), "failed"))
        .collect();

      const maxAttemptJob = failedJobs.reduce(
        (max, j) => (max && j.attempt > max.attempt ? j : max),
        failedJobs[0] as (typeof failedJobs)[0] | undefined,
      );
      if (!maxAttemptJob) {
        yield* db.patch(store._id, { isCrawling: true });
        yield* db.insert("crawlJobs", {
          storeId: store._id,
          enqueuedAt: now,
          status: "queued",
          attempt: 1,
        });
        newlyEnqueued++;
        processed++;
        continue;
      }

      const maxAttempt = maxAttemptJob.attempt;
      if (maxAttempt >= 3) continue;

      const backoffMs = RETRY_BACKOFF_MS[maxAttempt - 1];
      if (backoffMs === undefined) continue;
      const lastFailedAt =
        maxAttemptJob.finishedAt ?? maxAttemptJob.startedAt ?? maxAttemptJob.enqueuedAt;
      if (now - lastFailedAt < backoffMs) continue;

      yield* db.patch(store._id, { isCrawling: true });

      yield* db.insert("crawlJobs", {
        storeId: store._id,
        enqueuedAt: now,
        status: "queued",
        attempt: maxAttempt + 1,
      });

      newlyEnqueued++;
      processed++;
    }

    return { processed };
  }),
});

class RetryFailedJobsArgs extends Schema.Class<RetryFailedJobsArgs>("RetryFailedJobsArgs")({}) {}

class RetryFailedJobsResult extends Schema.Class<RetryFailedJobsResult>("RetryFailedJobsResult")({
  retriedCount: Schema.Number,
}) {}

export const retryFailedJobs = mutation({
  args: RetryFailedJobsArgs,
  returns: RetryFailedJobsResult,
  handler: Effect.fn("retryFailedJobs")(function* () {
    const { db } = yield* ConfectMutationCtx;
    const now = Date.now();

    const failedJobs = yield* db
      .query("crawlJobs")
      .filter((q) => q.eq(q.field("status"), "failed"))
      .collect();

    type StoreRetryInfo = { attempt: number; lastAttemptTime: number };
    const storesToRetry = new Map<string, StoreRetryInfo>();
    for (const job of failedJobs) {
      const storeId = job.storeId;
      const lastAttemptTime = job.finishedAt ?? job.startedAt ?? job.enqueuedAt;

      if (job.attempt >= 3) continue;

      const backoffMs = RETRY_BACKOFF_MS[job.attempt - 1];
      if (backoffMs === undefined) continue;
      if (now - lastAttemptTime < backoffMs) continue;

      const storeIdStr = storeId.toString();
      const existing = storesToRetry.get(storeIdStr);
      if (!existing || job.attempt > existing.attempt) {
        storesToRetry.set(storeIdStr, { attempt: job.attempt, lastAttemptTime });
      }
    }

    let retriedCount = 0;
    for (const [storeIdStr, info] of storesToRetry) {
      const storeId: Id.Id<"stores"> = storeIdStr as Id.Id<"stores">;
      const storeOption = yield* db.get(storeId);
      if (Option.isNone(storeOption)) continue;

      const store = storeOption.value;
      if ("isCrawling" in store && store.isCrawling) continue;

      yield* db.patch(storeId, { isCrawling: true });

      yield* db.insert("crawlJobs", {
        storeId,
        enqueuedAt: now,
        status: "queued",
        attempt: info.attempt + 1,
      });

      retriedCount++;
    }

    return { retriedCount };
  }),
});
