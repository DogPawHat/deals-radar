import { describe, it, expect } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { decode, tagError } from "../effect";

describe("decode", () => {
  const stringSchema = Schema.String;

  it("decodes valid input", () => {
    expect(Effect.runSync(decode(stringSchema)("hello"))).toBe("hello");
  });

  it("fails on invalid input", () => {
    const result = Effect.runSync(decode(stringSchema)(123).pipe(Effect.flip));
    expect(result._tag).toBe("ParseError");
  });
});

describe("tagError", () => {
  it("adds tag to error", () => {
    const error = new Error("test error");
    const tagged = tagError("MyTag")(error);
    expect((tagged as { _tag: string })._tag).toBe("MyTag");
    expect(tagged.message).toBe("test error");
  });
});
