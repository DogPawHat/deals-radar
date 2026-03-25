import { GenericId, GroupSpec } from "@confect/core";
import { Schema } from "effect";
import { workflowSpec } from "confect-workflow/spec";

export const extractSourceWorkflow = workflowSpec({
  name: "extractSourceWorkflow",
  args: Schema.Struct({
    store: Schema.Struct({
      _id: GenericId.GenericId("stores"),
      url: Schema.String,
    }),
  }),
  returns: Schema.Null,
});

export const workflowsSpec = GroupSpec.make("workflows").addFunction(extractSourceWorkflow);
