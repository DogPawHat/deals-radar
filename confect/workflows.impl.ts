import { FunctionImpl, GroupImpl } from "@confect/server";
import { Layer } from "effect";

import api from "./_generated/api";
import { extractSourceWorkflowDefinition } from "./workflows";

const extractSourceWorkflowImpl = FunctionImpl.make(
  api,
  "workflows",
  "extractSourceWorkflow",
  extractSourceWorkflowDefinition,
);

export const workflows = GroupImpl.make(api, "workflows").pipe(
  Layer.provide(extractSourceWorkflowImpl),
);
