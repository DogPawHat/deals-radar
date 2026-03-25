import { FunctionSpec, GenericId, GroupSpec, PaginationResult } from "@confect/core";
import { Schema } from "effect";

import { deals } from "./schema";

const GetDealsSort = Schema.Literal("newest", "biggestDrop", "price", "all");

const StoreSummary = Schema.Struct({
  _id: GenericId.GenericId("stores"),
  name: Schema.String,
  url: Schema.String,
});

export const publicDealsSpec = GroupSpec.make("publicDeals")
  .addFunction(
    FunctionSpec.publicQuery({
      name: "getDeals",
      args: Schema.Struct({
        sort: GetDealsSort,
        paginationOpts: Schema.Struct({
          cursor: Schema.NullOr(Schema.String),
          numItems: Schema.Number,
        }),
      }),
      returns: PaginationResult.PaginationResult(deals.Doc),
    }),
  )
  .addFunction(
    FunctionSpec.publicQuery({
      name: "getDealById",
      args: Schema.Struct({
        dealId: GenericId.GenericId("deals"),
      }),
      returns: Schema.Struct({
        deal: deals.Doc,
        store: Schema.optional(StoreSummary),
      }),
    }),
  );
