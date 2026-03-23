import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { Schema } from "effect";

export const priceHistorySpec = GroupSpec.make("priceHistory").addFunction(
  FunctionSpec.publicQuery({
    name: "getPriceHistory",
    args: Schema.Struct({
      dealId: GenericId.GenericId("deals"),
    }),
    returns: Schema.Struct({
      history: Schema.Array(
        Schema.Struct({
          price: Schema.Number,
          at: Schema.Number,
        }),
      ),
    }),
  }),
);
