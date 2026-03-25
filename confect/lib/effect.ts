import { Effect, Schema, Context } from "effect";
import { ParseError } from "effect/ParseResult";

export const decode =
  <A>(schema: Schema.Schema<A>) =>
  (input: unknown): Effect.Effect<A, ParseError> =>
    Schema.decodeUnknown(schema)(input);

export const tagError =
  <Tag extends string>(tag: Tag) =>
  <E extends Error>(error: E) => {
    const tagged = error as E & { _tag: Tag };
    tagged._tag = tag;
    return tagged;
  };

export const EffectContext = Context.Tag("deals-radar/effect/EffectContext");

export type EffectContext = Context.Context<typeof EffectContext>;
