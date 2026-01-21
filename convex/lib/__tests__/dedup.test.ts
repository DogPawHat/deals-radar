import { describe, it, expect } from "@effect/vitest";
import { Effect } from "effect";
import { normalizeTitle, normalizeUrl, createHash, buildDedupKey, DROP_PARAMS } from "../dedup";

describe("normalizeTitle", () => {
  it("trims whitespace", () => {
    expect(normalizeTitle("  hello world  ")).toBe("hello world");
  });

  it("lowercases text", () => {
    expect(normalizeTitle("HELLO WORLD")).toBe("hello world");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeTitle("hello    world")).toBe("hello world");
  });

  it("handles combined cases", () => {
    expect(normalizeTitle("  HELLO    WORLD  ")).toBe("hello world");
  });

  it("preserves single spaces", () => {
    expect(normalizeTitle("hello world test")).toBe("hello world test");
  });
});

describe("normalizeUrl", () => {
  it.effect("lowercases hostname", () =>
    Effect.gen(function* () {
      const result = yield* normalizeUrl("https://EXAMPLE.COM/path");
      expect(result).toBe("https://example.com/path");
    }),
  );

  it.effect("removes default http port 80", () =>
    Effect.gen(function* () {
      const result = yield* normalizeUrl("http://example.com:80/path");
      expect(result).toBe("http://example.com/path");
    }),
  );

  it.effect("removes default https port 443", () =>
    Effect.gen(function* () {
      const result = yield* normalizeUrl("https://example.com:443/path");
      expect(result).toBe("https://example.com/path");
    }),
  );

  it.effect("keeps non-default ports", () =>
    Effect.gen(function* () {
      const result = yield* normalizeUrl("https://example.com:8080/path");
      expect(result).toBe("https://example.com:8080/path");
    }),
  );

  it.effect("removes fragment/hash", () =>
    Effect.gen(function* () {
      const result = yield* normalizeUrl("https://example.com/path#section");
      expect(result).toBe("https://example.com/path");
    }),
  );

  it.effect("removes utm_source tracking param", () =>
    Effect.gen(function* () {
      const result = yield* normalizeUrl("https://example.com?utm_source=test");
      expect(result).toBe("https://example.com/");
    }),
  );

  it.effect("removes multiple tracking params", () =>
    Effect.gen(function* () {
      const result = yield* normalizeUrl(
        "https://example.com?utm_source=test&utm_medium=email&gclid=123",
      );
      expect(result).toBe("https://example.com/");
    }),
  );

  it.effect("keeps non-tracking params", () =>
    Effect.gen(function* () {
      const result = yield* normalizeUrl("https://example.com?product=123&utm_source=test");
      expect(result).toBe("https://example.com/?product=123");
    }),
  );

  it.effect("sorts query params alphabetically", () =>
    Effect.gen(function* () {
      const result = yield* normalizeUrl("https://example.com?z=1&a=2&m=3");
      expect(result).toBe("https://example.com/?a=2&m=3&z=1");
    }),
  );

  it.effect("removes trailing slash (non-root)", () =>
    Effect.gen(function* () {
      const result = yield* normalizeUrl("https://example.com/path/");
      expect(result).toBe("https://example.com/path");
    }),
  );

  it.effect("keeps root trailing slash", () =>
    Effect.gen(function* () {
      const result = yield* normalizeUrl("https://example.com/");
      expect(result).toBe("https://example.com/");
    }),
  );

  it.effect("fails on invalid URL", () =>
    Effect.gen(function* () {
      const result = yield* normalizeUrl("not-a-url").pipe(Effect.flip);
      expect(result._tag).toBe("NormalizeUrlError");
    }),
  );
});

describe("createHash", () => {
  it.effect("produces consistent hash for same input", () =>
    Effect.gen(function* () {
      const hash1 = yield* createHash("test input");
      const hash2 = yield* createHash("test input");
      expect(hash1).toBe(hash2);
    }),
  );

  it.effect("produces different hash for different input", () =>
    Effect.gen(function* () {
      const hash1 = yield* createHash("input one");
      const hash2 = yield* createHash("input two");
      expect(hash1).not.toBe(hash2);
    }),
  );

  it.effect("produces 64 character hex string (SHA-256)", () =>
    Effect.gen(function* () {
      const hash = yield* createHash("test");
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    }),
  );
});

describe("buildDedupKey", () => {
  it.effect("produces same key for equivalent URLs", () =>
    Effect.gen(function* () {
      const result1 = yield* buildDedupKey(
        "https://EXAMPLE.COM/product?utm_source=test",
        "Test Product",
      );
      const result2 = yield* buildDedupKey("https://example.com/product", "test product");
      expect(result1.dedupKey).toBe(result2.dedupKey);
    }),
  );

  it.effect("produces different key for different URLs", () =>
    Effect.gen(function* () {
      const result1 = yield* buildDedupKey("https://example.com/a", "Product");
      const result2 = yield* buildDedupKey("https://example.com/b", "Product");
      expect(result1.dedupKey).not.toBe(result2.dedupKey);
    }),
  );

  it.effect("produces different key for different titles", () =>
    Effect.gen(function* () {
      const result1 = yield* buildDedupKey("https://example.com/p", "Product A");
      const result2 = yield* buildDedupKey("https://example.com/p", "Product B");
      expect(result1.dedupKey).not.toBe(result2.dedupKey);
    }),
  );

  it.effect("returns canonical URL", () =>
    Effect.gen(function* () {
      const result = yield* buildDedupKey(
        "https://EXAMPLE.COM/path/?utm_source=test#hash",
        "Product",
      );
      expect(result.canonicalUrl).toBe("https://example.com/path");
    }),
  );
});

describe("DROP_PARAMS", () => {
  it("contains all common tracking parameters", () => {
    const expectedParams = ["utm_source", "utm_medium", "utm_campaign", "gclid", "fbclid"];
    for (const param of expectedParams) {
      expect(DROP_PARAMS.has(param)).toBe(true);
    }
  });
});
