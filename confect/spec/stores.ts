import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { Schema } from "effect";

import { stores } from "../schema";

export const storesSpec = GroupSpec.make("stores")
  .addFunction(
    FunctionSpec.publicQuery({
      name: "getById",
      args: Schema.Struct({
        storeId: GenericId.GenericId("stores"),
      }),
      returns: stores.Doc,
    }),
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: "deleteById",
      args: Schema.Struct({
        storeId: GenericId.GenericId("stores"),
      }),
      returns: Schema.Null,
    }),
  );
