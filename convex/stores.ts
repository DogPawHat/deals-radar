import { Id } from "@rjdellecese/confect/server";
import { query, mutation, ConfectQueryCtx, ConfectMutationCtx } from "./confect";
import { Schema, Effect, Option } from "effect";
import { confectSchema } from "./schema";

class GetByIdArgs extends Schema.Class<GetByIdArgs>("GetByIdArgs")({
  storeId: Id.Id("stores"),
}) {}

const GetByIdResult = confectSchema.tableSchemas.stores.withSystemFields;

export const getById = query({
  args: GetByIdArgs,
  returns: GetByIdResult,
  handler: Effect.fn("getById")(function* ({ storeId }) {
    const { db } = yield* ConfectQueryCtx;
    const resultOption = yield* db.get(storeId);
    const result = yield* resultOption;
    return result;
  }),
});

class DeleteByIdArgs extends Schema.Class<DeleteByIdArgs>("DeleteByIdArgs")({
  storeId: Id.Id("stores"),
}) {}

const DeleteByIdResult = Schema.Null;

export const deleteById = mutation({
  args: DeleteByIdArgs,
  returns: DeleteByIdResult,
  handler: Effect.fn("deleteById")(function* ({ storeId }) {
    const { db } = yield* ConfectMutationCtx;
    const existing = yield* db.get(storeId);
    if (Option.isNone(existing)) {
      throw new Error(`Store ${storeId} not found`);
    }
    return yield* db.delete(storeId).pipe(Effect.as(null));
  }),
});
