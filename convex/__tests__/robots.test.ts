import { describe, it, expect } from "@effect/vitest";
import { Effect } from "effect";
import { parseRobotsTxt, fetchRobotsTxt, fetchAndParseRobotsTxt } from "../robots";

describe("parseRobotsTxt", () => {
  it.effect("parses basic allow/disallow rules", () =>
    Effect.gen(function* () {
      const robotsContent = `
User-agent: *
Disallow: /admin/
Disallow: /private/
Allow: /public/
      `.trim();

      const result = yield* parseRobotsTxt(robotsContent);

      expect(result.rules.length).toBeGreaterThanOrEqual(3);
      expect(result.isBlocked("/admin/page")).toBe(true);
      expect(result.isBlocked("/private/page")).toBe(true);
      expect(result.isBlocked("/public/page")).toBe(false);
      expect(result.isBlocked("/other/page")).toBe(false);
    }),
  );

  it.effect("ignores comments", () =>
    Effect.gen(function* () {
      const robotsContent = `
# This is a comment
User-agent: *
Disallow: /secret/ # This is also a comment
      `.trim();

      const result = yield* parseRobotsTxt(robotsContent);

      expect(result.isBlocked("/secret/page")).toBe(true);
    }),
  );

  it.effect("handles empty robots.txt", () =>
    Effect.gen(function* () {
      const result = yield* parseRobotsTxt("");

      expect(result.rules).toHaveLength(0);
      expect(result.isBlocked("/any/path")).toBe(false);
    }),
  );

  it.effect("handles only comments", () =>
    Effect.gen(function* () {
      const robotsContent = `
# This is a comment
# Another comment
      `.trim();

      const result = yield* parseRobotsTxt(robotsContent);

      expect(result.rules).toHaveLength(0);
      expect(result.isBlocked("/any/path")).toBe(false);
    }),
  );

  it.effect("supports wildcard patterns ending with *", () =>
    Effect.gen(function* () {
      const robotsContent = `
User-agent: *
Disallow: /api/*
      `.trim();

      const result = yield* parseRobotsTxt(robotsContent);

      expect(result.isBlocked("/api/users")).toBe(true);
      expect(result.isBlocked("/api/v1/users")).toBe(true);
      expect(result.isBlocked("/api")).toBe(false);
    }),
  );

  it.effect("supports end-of-path patterns with $", () =>
    Effect.gen(function* () {
      const robotsContent = `
User-agent: *
Disallow: /private$
      `.trim();

      const result = yield* parseRobotsTxt(robotsContent);

      expect(result.isBlocked("/private")).toBe(true);
      expect(result.isBlocked("/private/")).toBe(false);
      expect(result.isBlocked("/private/page")).toBe(false);
    }),
  );

  it.effect("allows root path by default", () =>
    Effect.gen(function* () {
      const robotsContent = `
User-agent: *
Disallow: /admin/
      `.trim();

      const result = yield* parseRobotsTxt(robotsContent);

      expect(result.isBlocked("/")).toBe(false);
      expect(result.isBlocked("/home")).toBe(false);
    }),
  );
});

describe("fetchRobotsTxt", () => {
  it.effect("returns empty content for 404", () =>
    Effect.gen(function* () {
      const result = yield* fetchRobotsTxt("https://example.com");
      expect(result.content).toBe("");
    }),
  );
});

describe("fetchAndParseRobotsTxt", () => {
  it.effect("returns empty rules for 404", () =>
    Effect.gen(function* () {
      const result = yield* fetchAndParseRobotsTxt("https://example.com");
      expect(result.rules).toHaveLength(0);
      expect(result.isBlocked("/path")).toBe(false);
    }),
  );
});
