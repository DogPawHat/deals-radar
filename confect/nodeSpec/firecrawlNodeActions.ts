import { FunctionSpec, GroupSpec } from "@confect/core";
import { Schema } from "effect";

import { agentStateUnion } from "../../server/eSchemas";

export const firecrawlNodeActionsSpec = GroupSpec.makeNode("firecrawlNodeActions")
  .addFunction(
    FunctionSpec.internalNodeAction({
      name: "startAgent",
      args: Schema.Struct({
        urls: Schema.Array(Schema.String),
      }),
      returns: Schema.Struct({
        jobId: Schema.String,
      }),
    }),
  )
  .addFunction(
    FunctionSpec.internalNodeAction({
      name: "getAgentData",
      args: Schema.Struct({
        jobId: Schema.String,
      }),
      returns: agentStateUnion,
    }),
  );
