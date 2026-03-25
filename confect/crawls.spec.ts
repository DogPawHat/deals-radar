import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { Schema } from "effect";

import { DealExtractions } from "./lib/schemas";

const SuccessResult = Schema.Struct({
  success: Schema.Literal(true),
});

export const crawlsSpec = GroupSpec.make("crawls")
  .addFunction(
    FunctionSpec.internalMutation({
      name: "finishManualCrawl",
      args: Schema.Struct({
        workflowId: GenericId.GenericId("workflows"),
        result: Schema.Struct({
          deals: Schema.Array(
            Schema.Struct({
              title: Schema.String,
              url: Schema.String,
              image: Schema.optional(Schema.String),
              price: Schema.Number,
              currency: Schema.String,
            }),
          ),
        }),
        context: Schema.Struct({
          storeId: GenericId.GenericId("stores"),
        }),
      }),
      returns: SuccessResult,
    }),
  )
  .addFunction(
    FunctionSpec.internalMutation({
      name: "updateDealsForStore",
      args: Schema.Struct({
        storeId: GenericId.GenericId("stores"),
        deals: DealExtractions,
      }),
      returns: SuccessResult,
    }),
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "beginManualCrawl",
      args: Schema.Struct({
        storeId: GenericId.GenericId("stores"),
      }),
      returns: SuccessResult,
    }),
  );
