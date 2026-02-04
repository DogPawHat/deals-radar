import { Id } from "@rjdellecese/confect/server";
import { query, mutation, ConfectQueryCtx, ConfectMutationCtx } from "../confect";
import { Schema, Effect } from "effect";
import { fetchAndParseRobotsTxt } from "../robots";

class ListStoresArgs extends Schema.Class<ListStoresArgs>("ListStoresArgs")({}) {}

class PreviewRobotsArgs extends Schema.Class<PreviewRobotsArgs>("PreviewRobotsArgs")({
  url: Schema.String,
}) {}

const PreviewRobotsResult = Schema.Struct({
  rules: Schema.String,
  error: Schema.optional(Schema.String),
});

const StoreWithStats = Schema.Struct({
  _id: Id.Id("stores"),
  name: Schema.String,
  url: Schema.String,
  lastCrawlAt: Schema.optional(Schema.Number),
  isCrawling: Schema.Boolean,
  robotsRules: Schema.optional(Schema.String),
  dealCount: Schema.Number,
  lastJobStatus: Schema.optional(Schema.Literal("queued", "running", "done", "failed")),
  lastJobAt: Schema.optional(Schema.Number),
});

export const listStores = query({
  args: ListStoresArgs,
  returns: Schema.Array(StoreWithStats),
  handler: Effect.fn("listStores")(function* () {
    const { db } = yield* ConfectQueryCtx;

    const stores = yield* db.query("stores").collect();

    const storesWithStats: (typeof StoreWithStats.Type)[] = [];

    for (const store of stores) {
      const deals = yield* db
        .query("deals")
        .withIndex("by_storeId", (q) => q.eq("storeId", store._id))
        .collect();

      const jobs = yield* db
        .query("crawlJobs")
        .withIndex("by_storeId", (q) => q.eq("storeId", store._id))
        .collect();

      const sortedJobs = jobs.sort((a, b) => b.enqueuedAt - a.enqueuedAt);
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
});

export const previewRobots = query({
  args: PreviewRobotsArgs,
  returns: PreviewRobotsResult,
  handler: Effect.fn("previewRobots")(function* ({ url }) {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      return { rules: "", error: "URL is required" };
    }

    return yield* Effect.catchAll(
      Effect.gen(function* () {
        const result = yield* fetchAndParseRobotsTxt(trimmedUrl);
        const lines = result.rules.map((rule) =>
          rule.allow ? `Allow: ${rule.allow}` : `Disallow: ${rule.disallow}`,
        );

        return { rules: lines.join("\n") };
      }),
      (error) => {
        const message =
          typeof error === "object" && error && "message" in error
            ? String(error.message)
            : "Unable to fetch robots.txt";

        return Effect.succeed({ rules: "", error: message });
      },
    );
  }),
});

class CreateStoreArgs extends Schema.Class<CreateStoreArgs>("CreateStoreArgs")({
  name: Schema.String,
  url: Schema.String,
}) {}

const CreateStoreResult = Schema.Struct({
  storeId: Id.Id("stores"),
});

const COOLDOWN_MS = 3 * 60 * 1000;

export const createStore = mutation({
  args: CreateStoreArgs,
  returns: CreateStoreResult,
  handler: Effect.fn("createStore")(function* ({ name, url }) {
    const { db } = yield* ConfectMutationCtx;

    const trimmedUrl = url.trim();
    let robotsRules: string | undefined;

    try {
      const result = yield* fetchAndParseRobotsTxt(trimmedUrl);
      const lines = result.rules.map((r) =>
        r.allow ? `Allow: ${r.allow}` : `Disallow: ${r.disallow}`,
      );
      robotsRules = lines.join("\n");
    } catch {
      // robots fetch failed, continue without rules
    }

    const storeId = yield* db.insert("stores", {
      name: name.trim(),
      url: trimmedUrl,
      isCrawling: false,
      robotsRules,
    });

    return { storeId };
  }),
});

class RunNowArgs extends Schema.Class<RunNowArgs>("RunNowArgs")({
  storeId: Id.Id("stores"),
}) {}

const RunNowResult = Schema.Struct({
  success: Schema.Boolean,
  cooldownRemainingMs: Schema.Number,
  message: Schema.String,
});

export const runNow = mutation({
  args: RunNowArgs,
  returns: RunNowResult,
  handler: Effect.fn("runNow")(function* ({ storeId }) {
    const { db } = yield* ConfectMutationCtx;

    const now = Date.now();

    const recentJobs = yield* db
      .query("crawlJobs")
      .filter((q) =>
        q.and(q.eq(q.field("storeId"), storeId), q.gte(q.field("enqueuedAt"), now - COOLDOWN_MS)),
      )
      .collect();

    const queuedOrRunning = recentJobs.filter(
      (j) => j.status === "queued" || j.status === "running",
    );

    if (queuedOrRunning.length > 0) {
      const oldestJob = queuedOrRunning.reduce((min, j) =>
        j.enqueuedAt < min.enqueuedAt ? j : min,
      );
      const cooldownRemaining = COOLDOWN_MS - (now - oldestJob.enqueuedAt);

      return {
        success: false,
        cooldownRemainingMs: Math.max(0, cooldownRemaining),
        message: "Crawl already in progress or recently enqueued",
      };
    }

    const storeOption = yield* db.get(storeId);
    const store = yield* storeOption;

    if (store.isCrawling) {
      return {
        success: false,
        cooldownRemainingMs: 0,
        message: "Store is currently crawling",
      };
    }

    yield* db.patch(storeId, { isCrawling: true });

    yield* db.insert("crawlJobs", {
      storeId,
      enqueuedAt: now,
      status: "queued",
      attempt: 1,
    });

    return {
      success: true,
      cooldownRemainingMs: 0,
      message: "Crawl job enqueued",
    };
  }),
});

class GetStoreArgs extends Schema.Class<GetStoreArgs>("GetStoreArgs")({
  storeId: Id.Id("stores"),
}) {}

const CrawlJobInfo = Schema.Struct({
  _id: Id.Id("crawlJobs"),
  enqueuedAt: Schema.Number,
  startedAt: Schema.optional(Schema.Number),
  finishedAt: Schema.optional(Schema.Number),
  status: Schema.Literal("queued", "running", "done", "failed"),
  resultCount: Schema.optional(Schema.Number),
  blockedByRobots: Schema.optional(Schema.Boolean),
  blockedRule: Schema.optional(Schema.String),
  errorDetails: Schema.optional(Schema.String),
  attempt: Schema.Number,
});

const GetStoreResult = Schema.Struct({
  store: Schema.Struct({
    _id: Id.Id("stores"),
    name: Schema.String,
    url: Schema.String,
    lastCrawlAt: Schema.optional(Schema.Number),
    isCrawling: Schema.Boolean,
    robotsRules: Schema.optional(Schema.String),
  }),
  recentJobs: Schema.Array(CrawlJobInfo),
});

export const getStore = query({
  args: GetStoreArgs,
  returns: GetStoreResult,
  handler: Effect.fn("getStore")(function* ({ storeId }) {
    const { db } = yield* ConfectQueryCtx;

    const storeOption = yield* db.get(storeId);
    const store = yield* storeOption;

    const jobs = yield* db
      .query("crawlJobs")
      .withIndex("by_storeId", (q) => q.eq("storeId", storeId))
      .collect();

    const sortedJobs = jobs.sort((a, b) => b.enqueuedAt - a.enqueuedAt).slice(0, 10);

    return {
      store: {
        _id: store._id,
        name: store.name,
        url: store.url,
        lastCrawlAt: store.lastCrawlAt,
        isCrawling: store.isCrawling,
        robotsRules: store.robotsRules,
      },
      recentJobs: sortedJobs,
    };
  }),
});

class UpdateStoreArgs extends Schema.Class<UpdateStoreArgs>("UpdateStoreArgs")({
  storeId: Id.Id("stores"),
  name: Schema.String,
  url: Schema.String,
}) {}

const UpdateStoreResult = Schema.Struct({
  success: Schema.Boolean,
});

export const updateStore = mutation({
  args: UpdateStoreArgs,
  returns: UpdateStoreResult,
  handler: Effect.fn("updateStore")(function* ({ storeId, name, url }) {
    const { db } = yield* ConfectMutationCtx;

    const storeOption = yield* db.get(storeId);
    yield* storeOption;

    let robotsRules: string | undefined;

    try {
      const result = yield* fetchAndParseRobotsTxt(url.trim());
      const lines = result.rules.map((r) =>
        r.allow ? `Allow: ${r.allow}` : `Disallow: ${r.disallow}`,
      );
      robotsRules = lines.join("\n");
    } catch {
      // robots fetch failed, continue without rules
    }

    yield* db.patch(storeId, {
      name: name.trim(),
      url: url.trim(),
      robotsRules,
    });

    return { success: true };
  }),
});

class DeleteStoreArgs extends Schema.Class<DeleteStoreArgs>("DeleteStoreArgs")({
  storeId: Id.Id("stores"),
}) {}

const DeleteStoreResult = Schema.Struct({
  success: Schema.Boolean,
});

export const deleteStore = mutation({
  args: DeleteStoreArgs,
  returns: DeleteStoreResult,
  handler: Effect.fn("deleteStore")(function* ({ storeId }) {
    const { db } = yield* ConfectMutationCtx;

    yield* db.delete(storeId);

    return { success: true };
  }),
});
