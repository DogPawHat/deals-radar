import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { Schema } from "effect";

export const sourcesSpec = GroupSpec.make("sources")
  .addFunction(
    FunctionSpec.publicQuery({
      name: "listStores",
      args: Schema.Struct({}),
      returns: Schema.Array(
        Schema.Struct({
          _id: GenericId.GenericId("stores"),
          name: Schema.String,
          url: Schema.String,
          lastCrawlAt: Schema.optional(Schema.Number),
          isCrawling: Schema.Boolean,
          robotsRules: Schema.optional(Schema.String),
          dealCount: Schema.Number,
          lastJobStatus: Schema.optional(Schema.Literal("queued", "running", "done", "failed")),
          lastJobAt: Schema.optional(Schema.Number),
        }),
      ),
    }),
  )
  .addFunction(
    FunctionSpec.internalMutation({
      name: "updateStoreRobotsRules",
      args: Schema.Struct({
        storeId: GenericId.GenericId("stores"),
        robotsRules: Schema.optional(Schema.String),
      }),
      returns: Schema.Null,
    }),
  )
  .addFunction(
    FunctionSpec.internalAction({
      name: "refreshStoreRobotsRules",
      args: Schema.Struct({
        storeId: GenericId.GenericId("stores"),
        url: Schema.String,
      }),
      returns: Schema.Null,
    }),
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "createStore",
      args: Schema.Struct({
        name: Schema.String,
        url: Schema.String,
      }),
      returns: Schema.Struct({
        storeId: GenericId.GenericId("stores"),
      }),
    }),
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "runNow",
      args: Schema.Struct({
        storeId: GenericId.GenericId("stores"),
      }),
      returns: Schema.Struct({
        success: Schema.Boolean,
        cooldownRemainingMs: Schema.Number,
        message: Schema.String,
      }),
    }),
  )
  .addFunction(
    FunctionSpec.publicQuery({
      name: "getStore",
      args: Schema.Struct({
        storeId: GenericId.GenericId("stores"),
      }),
      returns: Schema.Struct({
        store: Schema.Struct({
          _id: GenericId.GenericId("stores"),
          name: Schema.String,
          url: Schema.String,
          lastCrawlAt: Schema.optional(Schema.Number),
          isCrawling: Schema.Boolean,
          robotsRules: Schema.optional(Schema.String),
        }),
        recentJobs: Schema.Array(
          Schema.Struct({
            _id: GenericId.GenericId("crawlJobs"),
            enqueuedAt: Schema.Number,
            startedAt: Schema.optional(Schema.Number),
            finishedAt: Schema.optional(Schema.Number),
            status: Schema.Literal("queued", "running", "done", "failed"),
            resultCount: Schema.optional(Schema.Number),
            blockedByRobots: Schema.optional(Schema.Boolean),
            blockedRule: Schema.optional(Schema.String),
            errorDetails: Schema.optional(Schema.String),
            attempt: Schema.Number,
          }),
        ),
      }),
    }),
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "updateStore",
      args: Schema.Struct({
        storeId: GenericId.GenericId("stores"),
        name: Schema.String,
        url: Schema.String,
      }),
      returns: Schema.Struct({
        success: Schema.Boolean,
      }),
    }),
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "deleteStore",
      args: Schema.Struct({
        storeId: GenericId.GenericId("stores"),
      }),
      returns: Schema.Struct({
        success: Schema.Boolean,
      }),
    }),
  );
