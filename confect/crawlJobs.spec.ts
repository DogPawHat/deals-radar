import { FunctionSpec, GroupSpec } from "@confect/core";
import { Schema } from "effect";

export const crawlJobsSpec = GroupSpec.make("crawlJobs")
  .addFunction(
    FunctionSpec.publicMutation({
      name: "crawlTick",
      args: Schema.Struct({}),
      returns: Schema.Struct({
        processed: Schema.Number,
      }),
    }),
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "retryFailedJobs",
      args: Schema.Struct({}),
      returns: Schema.Struct({
        retriedCount: Schema.Number,
      }),
    }),
  );
