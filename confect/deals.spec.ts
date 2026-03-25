import { FunctionSpec, GroupSpec } from "@confect/core";
import { GenericId } from "@confect/core";
import { Schema } from "effect";

import { deals } from "./schema";

export const dealsSpec = GroupSpec.make("deals").addFunction(
  FunctionSpec.publicQuery({
    name: "getDealsForStore",
    args: Schema.Struct({
      storeId: GenericId.GenericId("stores"),
    }),
    returns: Schema.Array(deals.Doc),
  }),
);
