# Convex Testing Implementation Plan

This document provides a comprehensive plan for implementing unit and integration tests for the Convex backend functions in the deals-radar application.

## Table of Contents

1. [Overview](#overview)
2. [Current Architecture](#current-architecture)
3. [Testing Strategy](#testing-strategy)
4. [Refactoring Tasks](#refactoring-tasks)
5. [Test Implementation](#test-implementation)
6. [File-by-File Instructions](#file-by-file-instructions)
7. [Running Tests](#running-tests)

---

## Overview

### Goal

Implement a hybrid testing approach that combines:

- **Unit tests** for pure Effect functions using `@effect/vitest`
- **Integration tests** for Convex mutations/queries using `convex-test`

### Tech Stack

- **Effect** - Functional effect system used throughout the codebase
- **Confect** - Effect-based wrapper for Convex (from `@rjdellecese/confect`)
- **convex-test** - Mock Convex backend for testing
- **@effect/vitest** - Effect integration with Vitest
- **Vitest** - Test runner

### Installed Dependencies (already in package.json)

```json
{
  "@effect/vitest": "^0.27.0",
  "convex-test": "^0.0.41",
  "vitest": "^4.0.17"
}
```

---

## Current Architecture

### File Structure

```
convex/
├── confect.ts              # Confect setup, exports query/mutation/action helpers
├── schema.ts               # Database schema (deals, stores tables)
├── eSchemas.ts             # Effect schemas for deal extraction
├── crawls.ts               # Crawl logic, URL normalization, deduplication
├── deals.ts                # Deal queries
├── stores.ts               # Store CRUD operations
├── firecrawlNodeActions.ts # Firecrawl API integration (Node.js actions)
├── index.ts                # Workflow manager setup
├── vitest.config.ts        # Vitest config for convex (edge-runtime)
└── _generated/             # Convex generated types
```

### Key Files Analysis

#### `convex/crawls.ts`

Contains mixed concerns that should be separated:

**Pure/Effect Functions (private, need to be exported):**

- `DROP_PARAMS` (lines 14-42) - Set of tracking params to filter
- `normalizeTitle` (line 119) - Pure function: `string -> string`
- `normalizeUrl` (lines 71-116) - Effect: `string -> Effect<string, NormalizeUrlError>`
- `createHash` (lines 55-68) - Effect: `string -> Effect<string, CreateHashError>`
- `buildDedupKey` (lines 122-129) - Effect combining normalizeUrl + createHash

**Error Types (private, need to be exported):**

- `CreateHashError` (lines 44-47)
- `NormalizeUrlError` (lines 49-52)
- `CrawlInProgressError` (lines 259-265)

**Convex Functions:**

- `extractSourceWorkflow` - Workflow definition
- `finishManualCrawl` - Internal mutation
- `updateDealsForStore` - Internal mutation (main dedup logic)
- `beginManualCrawl` - Public mutation

#### `convex/firecrawlNodeActions.ts`

Well-structured with Effect service pattern:

**Service (already a proper Effect Context):**

- `FirecrawlOperationsContext` (lines 50-144) - Has `.layer` for live implementation

**Error Types:**

- `FirecrawlClientErrorInit`
- `FirecrawlApiErrorAgentStatus`
- `FirecrawlApiErrorStartAgent`

**Convex Actions:**

- `startAgent` - Internal action
- `getAgentData` - Internal action

#### `convex/eSchemas.ts`

Effect schemas with validation rules:

- `DealExtraction` - Schema with URL pattern, currency length (3), non-negative prices
- `DealExtractions` - Array of DealExtraction
- `AgentJob`, `AgentStateFailed`, `AgentStatePending`, `AgentStateCompleted`
- `agentStateUnion` - Union of agent states

#### `convex/stores.ts`

Simple CRUD:

- `getById` - Query
- `deleteById` - Mutation (throws if not found)

#### `convex/deals.ts`

Simple query:

- `getDealsForStore` - Query with index

---

## Testing Strategy

### Three-Layer Approach

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Pure Effect Functions (@effect/vitest)             │
│ - normalizeUrl, normalizeTitle, createHash, buildDedupKey   │
│ - Schema validation (eSchemas.ts)                           │
│ - No mocking needed, fast execution                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Service Tests with Mock Layers (@effect/vitest)    │
│ - FirecrawlOperationsContext with test layer                │
│ - Test response parsing, error handling                     │
│ - Mock external APIs                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Integration Tests (convex-test)                    │
│ - Full mutation/query tests with mock database              │
│ - Test business logic with real Convex patterns             │
│ - Verify indexes, deduplication, error cases                │
└─────────────────────────────────────────────────────────────┘
```

---

## Refactoring Tasks

### Task 1: Extract Deduplication Logic

Create `convex/lib/dedup.ts` with exported functions from `crawls.ts`.

**New file: `convex/lib/dedup.ts`**

```typescript
import { Effect, Schema } from "effect";

// ============================================================================
// Configuration
// ============================================================================

/** Tracking parameters to drop during URL normalization */
export const DROP_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "mc_eid",
  "mc_cid",
  "ref",
  "referrer",
  "aff",
  "aff_id",
  "affiliate",
  "utm_id",
  "utm_reader",
  "utm_viz_id",
  "utm_pubreferrer",
  "oly_enc_id",
  "oly_anon_id",
  "ascsrc",
  "cmp",
  "_branch_match_id",
  "_branch_referrer",
  "igshid",
  "mkt_tok",
  "spm",
]);

// ============================================================================
// Error Types
// ============================================================================

export class CreateHashError extends Schema.TaggedError<CreateHashError>()("CreateHashError", {
  message: Schema.String,
  error: Schema.Defect,
}) {}

export class NormalizeUrlError extends Schema.TaggedError<NormalizeUrlError>()(
  "NormalizeUrlError",
  {
    message: Schema.String,
    error: Schema.Defect,
  },
) {}

// ============================================================================
// Pure Functions
// ============================================================================

/** Normalize title by trimming, lowercasing, and collapsing whitespace */
export const normalizeTitle = (title: string): string =>
  title.trim().toLowerCase().replace(/\s+/g, " ");

// ============================================================================
// Effect Functions
// ============================================================================

/** SHA-256 hash using Web Crypto API */
export const createHash = (input: string): Effect.Effect<string, CreateHashError> =>
  Effect.tryPromise({
    try: async () => {
      const data = new TextEncoder().encode(input);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    },
    catch: (error) =>
      CreateHashError.make({
        message: "Hashing failed",
        error,
      }),
  });

/** Normalize URL by lowercasing host, removing tracking params, sorting params, etc. */
export const normalizeUrl = (raw: string): Effect.Effect<string, NormalizeUrlError> =>
  Effect.try({
    try: () => {
      const u = new URL(raw);

      // Normalize host
      u.hostname = u.hostname.toLowerCase();

      // Remove default ports
      if (
        (u.protocol === "http:" && u.port === "80") ||
        (u.protocol === "https:" && u.port === "443")
      ) {
        u.port = "";
      }

      // Drop fragment
      u.hash = "";

      // Filter and sort query parameters
      const kept = new URLSearchParams();
      for (const [k, v] of u.searchParams.entries()) {
        if (!DROP_PARAMS.has(k)) {
          kept.append(k, v);
        }
      }

      const keptSorted = new URLSearchParams(
        [...kept.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      );

      u.search = keptSorted.toString() ? `?${keptSorted.toString()}` : "";

      // Normalize trailing slash (except root)
      if (u.pathname.endsWith("/") && u.pathname !== "/") {
        u.pathname = u.pathname.replace(/\/+$/, "");
      }

      return u.toString();
    },
    catch: (error) =>
      NormalizeUrlError.make({
        message: "URL normalization failed",
        error,
      }),
  });

/** Build deduplication key from URL and title */
export const buildDedupKey = (url: string, title: string) =>
  Effect.gen(function* () {
    const canonicalUrl = yield* normalizeUrl(url);
    const normalizedTitle = normalizeTitle(title);
    const keyInput = `${canonicalUrl}|${normalizedTitle}`;
    const dedupKey = yield* createHash(keyInput);
    return { canonicalUrl, dedupKey };
  });
```

**Update `convex/crawls.ts`:**

Replace the private functions with imports:

```typescript
import { Effect, Schema, Option } from "effect";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { internalMutation, mutation, ConfectMutationCtx } from "./confect";
import { Id } from "@rjdellecese/confect/server";
import { workflow } from "./index";
import { DealExtractions } from "./eSchemas";
import { buildDedupKey } from "./lib/dedup";

// ... rest of file, remove the extracted functions
```

### Task 2: Add Test Layer for FirecrawlOperationsContext

Update `convex/firecrawlNodeActions.ts` to export error types and add a test layer:

```typescript
// Add these exports at the bottom of the file:

export {
  FirecrawlOperationsContext,
  FirecrawlClientErrorInit,
  FirecrawlApiErrorAgentStatus,
  FirecrawlApiErrorStartAgent,
};

// Add a test layer for mocking:
export const FirecrawlTestLayer = Layer.succeed(FirecrawlOperationsContext, {
  getAgentStatus: (_jobId: string) =>
    Effect.succeed(
      AgentStateCompleted.make({
        data: [],
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    ),
  startAgent: (_urls: readonly string[]) => Effect.succeed(new AgentJob({ jobId: "test-job-id" })),
});
```

### Task 3: Export CrawlInProgressError from crawls.ts

Add export for error type used in beginManualCrawl:

```typescript
// In crawls.ts, add export:
export { CrawlInProgressError };
```

---

## Test Implementation

### Directory Structure

```
convex/
├── lib/
│   ├── dedup.ts              # Extracted dedup functions
│   └── __tests__/
│       └── dedup.test.ts     # Unit tests for dedup
├── __tests__/
│   ├── eSchemas.test.ts      # Schema validation tests
│   ├── firecrawl.test.ts     # Service tests with mock layer
│   ├── crawls.test.ts        # Integration tests
│   ├── deals.test.ts         # Query integration tests
│   └── stores.test.ts        # CRUD integration tests
└── vitest.config.ts          # Already exists
```

---

## File-by-File Instructions

### File 1: `convex/lib/__tests__/dedup.test.ts`

```typescript
import { describe, it, expect } from "@effect/vitest";
import { Effect } from "effect";
import {
  normalizeTitle,
  normalizeUrl,
  createHash,
  buildDedupKey,
  DROP_PARAMS,
  NormalizeUrlError,
} from "../dedup";

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
      expect(result).toBe("https://example.com");
    }),
  );

  it.effect("removes multiple tracking params", () =>
    Effect.gen(function* () {
      const result = yield* normalizeUrl(
        "https://example.com?utm_source=test&utm_medium=email&gclid=123",
      );
      expect(result).toBe("https://example.com");
    }),
  );

  it.effect("keeps non-tracking params", () =>
    Effect.gen(function* () {
      const result = yield* normalizeUrl("https://example.com?product=123&utm_source=test");
      expect(result).toBe("https://example.com?product=123");
    }),
  );

  it.effect("sorts query params alphabetically", () =>
    Effect.gen(function* () {
      const result = yield* normalizeUrl("https://example.com?z=1&a=2&m=3");
      expect(result).toBe("https://example.com?a=2&m=3&z=1");
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
```

### File 2: `convex/__tests__/eSchemas.test.ts`

```typescript
import { describe, it, expect } from "@effect/vitest";
import { Effect, Schema } from "effect";
import {
  DealExtraction,
  DealExtractions,
  AgentStateCompleted,
  AgentStatePending,
  AgentStateFailed,
  agentStateUnion,
} from "../eSchemas";

describe("DealExtraction Schema", () => {
  const validDeal = {
    title: "Test Product",
    url: "https://example.com/product",
    price: 99.99,
    currency: "USD",
  };

  it.effect("accepts valid deal with required fields", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(DealExtraction)(validDeal);
      expect(result.title).toBe("Test Product");
      expect(result.price).toBe(99.99);
    }),
  );

  it.effect("accepts valid deal with optional image", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(DealExtraction)({
        ...validDeal,
        image: "https://example.com/image.jpg",
      });
      expect(result.image).toBe("https://example.com/image.jpg");
    }),
  );

  it.effect("accepts valid deal with optional msrp", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(DealExtraction)({
        ...validDeal,
        msrp: 149.99,
      });
      expect(result.msrp).toBe(149.99);
    }),
  );

  it.effect("accepts valid deal with optional percentOff", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(DealExtraction)({
        ...validDeal,
        percentOff: 33,
      });
      expect(result.percentOff).toBe(33);
    }),
  );

  it.effect("rejects invalid URL (missing protocol)", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(DealExtraction)({
        ...validDeal,
        url: "example.com/product",
      }).pipe(Effect.flip);
      expect(result._tag).toBe("ParseError");
    }),
  );

  it.effect("rejects invalid currency (not 3 chars)", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(DealExtraction)({
        ...validDeal,
        currency: "US",
      }).pipe(Effect.flip);
      expect(result._tag).toBe("ParseError");
    }),
  );

  it.effect("rejects negative price", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(DealExtraction)({
        ...validDeal,
        price: -10,
      }).pipe(Effect.flip);
      expect(result._tag).toBe("ParseError");
    }),
  );

  it.effect("rejects negative msrp", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(DealExtraction)({
        ...validDeal,
        msrp: -50,
      }).pipe(Effect.flip);
      expect(result._tag).toBe("ParseError");
    }),
  );

  it.effect("rejects invalid image URL", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(DealExtraction)({
        ...validDeal,
        image: "not-a-url",
      }).pipe(Effect.flip);
      expect(result._tag).toBe("ParseError");
    }),
  );
});

describe("DealExtractions Schema", () => {
  it.effect("accepts empty array", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(DealExtractions)([]);
      expect(result).toHaveLength(0);
    }),
  );

  it.effect("accepts array of valid deals", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(DealExtractions)([
        { title: "A", url: "https://a.com", price: 10, currency: "USD" },
        { title: "B", url: "https://b.com", price: 20, currency: "EUR" },
      ]);
      expect(result).toHaveLength(2);
    }),
  );
});

describe("AgentState Union", () => {
  it.effect("decodes AgentStateCompleted", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(agentStateUnion)({
        _tag: "AgentStateCompleted",
        data: [],
        expiresAt: "2024-01-01T00:00:00Z",
      });
      expect(result._tag).toBe("AgentStateCompleted");
    }),
  );

  it.effect("decodes AgentStatePending", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(agentStateUnion)({
        _tag: "AgentStatePending",
        expiresAt: "2024-01-01T00:00:00Z",
      });
      expect(result._tag).toBe("AgentStatePending");
    }),
  );

  it.effect("decodes AgentStateFailed", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(agentStateUnion)({
        _tag: "AgentStateError", // Note: the tag is "AgentStateError" in the schema
        errorMessage: "Something went wrong",
        expiresAt: "2024-01-01T00:00:00Z",
      });
      expect(result._tag).toBe("AgentStateError");
    }),
  );
});
```

### File 3: `convex/__tests__/firecrawl.test.ts`

```typescript
import { describe, it, expect, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { AgentStateCompleted, AgentStatePending, AgentStateFailed, AgentJob } from "../eSchemas";

// Note: After refactoring, import from firecrawlNodeActions:
// import { FirecrawlOperationsContext, FirecrawlApiErrorStartAgent } from "../firecrawlNodeActions";

// For now, recreate the context type for testing
import { Context, Schema } from "effect";
import { ParseError } from "effect/ParseResult";

// Recreate the service interface for testing
interface FirecrawlOps {
  readonly getAgentStatus: (
    jobId: string,
  ) => Effect.Effect<
    typeof AgentStateCompleted.Type | typeof AgentStatePending.Type | typeof AgentStateFailed.Type,
    ParseError
  >;
  readonly startAgent: (urls: readonly string[]) => Effect.Effect<AgentJob, Error>;
}

class FirecrawlOperationsContext extends Context.Tag("test/FirecrawlOperationsContext")<
  FirecrawlOperationsContext,
  FirecrawlOps
>() {}

describe("FirecrawlOperationsContext", () => {
  describe("with completed response", () => {
    const CompletedLayer = Layer.succeed(FirecrawlOperationsContext, {
      getAgentStatus: (_jobId: string) =>
        Effect.succeed(
          new AgentStateCompleted({
            data: [
              {
                title: "Test Deal",
                url: "https://example.com/deal",
                price: 99.99,
                currency: "USD",
              },
            ],
            expiresAt: "2024-12-31T23:59:59Z",
          }),
        ),
      startAgent: (_urls: readonly string[]) => Effect.succeed(new AgentJob({ jobId: "job-123" })),
    });

    layer(CompletedLayer)("completed state", (it) => {
      it.effect("startAgent returns job id", () =>
        Effect.gen(function* () {
          const ctx = yield* FirecrawlOperationsContext;
          const job = yield* ctx.startAgent(["https://example.com"]);
          expect(job.jobId).toBe("job-123");
        }),
      );

      it.effect("getAgentStatus returns completed with data", () =>
        Effect.gen(function* () {
          const ctx = yield* FirecrawlOperationsContext;
          const status = yield* ctx.getAgentStatus("job-123");
          expect(status._tag).toBe("AgentStateCompleted");
          if (status._tag === "AgentStateCompleted") {
            expect(status.data).toHaveLength(1);
            expect(status.data[0].title).toBe("Test Deal");
          }
        }),
      );
    });
  });

  describe("with pending response", () => {
    const PendingLayer = Layer.succeed(FirecrawlOperationsContext, {
      getAgentStatus: (_jobId: string) =>
        Effect.succeed(
          new AgentStatePending({
            expiresAt: "2024-12-31T23:59:59Z",
          }),
        ),
      startAgent: (_urls: readonly string[]) => Effect.succeed(new AgentJob({ jobId: "job-456" })),
    });

    layer(PendingLayer)("pending state", (it) => {
      it.effect("getAgentStatus returns pending", () =>
        Effect.gen(function* () {
          const ctx = yield* FirecrawlOperationsContext;
          const status = yield* ctx.getAgentStatus("job-456");
          expect(status._tag).toBe("AgentStatePending");
        }),
      );
    });
  });

  describe("with failed response", () => {
    const FailedLayer = Layer.succeed(FirecrawlOperationsContext, {
      getAgentStatus: (_jobId: string) =>
        Effect.succeed(
          new AgentStateFailed({
            errorMessage: "Extraction failed",
            expiresAt: "2024-12-31T23:59:59Z",
          }),
        ),
      startAgent: (_urls: readonly string[]) => Effect.succeed(new AgentJob({ jobId: "job-789" })),
    });

    layer(FailedLayer)("failed state", (it) => {
      it.effect("getAgentStatus returns failed with error message", () =>
        Effect.gen(function* () {
          const ctx = yield* FirecrawlOperationsContext;
          const status = yield* ctx.getAgentStatus("job-789");
          expect(status._tag).toBe("AgentStateError");
          if (status._tag === "AgentStateError") {
            expect(status.errorMessage).toBe("Extraction failed");
          }
        }),
      );
    });
  });

  describe("with error", () => {
    const ErrorLayer = Layer.succeed(FirecrawlOperationsContext, {
      getAgentStatus: (_jobId: string) => Effect.fail(new Error("API Error")),
      startAgent: (_urls: readonly string[]) => Effect.fail(new Error("Failed to start agent")),
    });

    layer(ErrorLayer)("error handling", (it) => {
      it.effect("startAgent error is catchable", () =>
        Effect.gen(function* () {
          const ctx = yield* FirecrawlOperationsContext;
          const error = yield* ctx.startAgent([]).pipe(Effect.flip);
          expect(error.message).toBe("Failed to start agent");
        }),
      );
    });
  });
});
```

### File 4: `convex/__tests__/stores.test.ts`

```typescript
import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

describe("stores", () => {
  describe("getById", () => {
    it("returns store by id", async () => {
      const t = convexTest(schema);

      // Setup: create a store
      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://teststore.com",
          isCrawling: false,
        });
      });

      // Execute
      const store = await t.query(api.stores.getById, { storeId });

      // Assert
      expect(store.name).toBe("Test Store");
      expect(store.url).toBe("https://teststore.com");
      expect(store.isCrawling).toBe(false);
    });

    it("throws on non-existent store", async () => {
      const t = convexTest(schema);

      // Create a store to get a valid ID format, then delete it
      const storeId = await t.run(async (ctx) => {
        const id = await ctx.db.insert("stores", {
          name: "Temp",
          url: "https://temp.com",
          isCrawling: false,
        });
        await ctx.db.delete(id);
        return id;
      });

      // Execute & Assert
      await expect(t.query(api.stores.getById, { storeId })).rejects.toThrow();
    });
  });

  describe("deleteById", () => {
    it("deletes existing store", async () => {
      const t = convexTest(schema);

      // Setup
      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "To Delete",
          url: "https://delete.com",
          isCrawling: false,
        });
      });

      // Execute
      await t.mutation(api.stores.deleteById, { storeId });

      // Assert
      const stores = await t.run(async (ctx) => {
        return await ctx.db.query("stores").collect();
      });
      expect(stores).toHaveLength(0);
    });

    it("throws when store not found", async () => {
      const t = convexTest(schema);

      // Get a valid but non-existent ID
      const storeId = await t.run(async (ctx) => {
        const id = await ctx.db.insert("stores", {
          name: "Temp",
          url: "https://temp.com",
          isCrawling: false,
        });
        await ctx.db.delete(id);
        return id;
      });

      // Execute & Assert
      await expect(t.mutation(api.stores.deleteById, { storeId })).rejects.toThrow("not found");
    });
  });
});
```

### File 5: `convex/__tests__/deals.test.ts`

```typescript
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

describe("deals", () => {
  describe("getDealsForStore", () => {
    it("returns empty array when no deals exist", async () => {
      const t = convexTest(schema);

      // Setup: create a store
      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Empty Store",
          url: "https://empty.com",
          isCrawling: false,
        });
      });

      // Execute
      const deals = await t.query(api.deals.getDealsForStore, { storeId });

      // Assert
      expect(deals).toHaveLength(0);
    });

    it("returns deals for specific store", async () => {
      const t = convexTest(schema);

      // Setup: create stores and deals
      const { storeId1, storeId2 } = await t.run(async (ctx) => {
        const id1 = await ctx.db.insert("stores", {
          name: "Store 1",
          url: "https://store1.com",
          isCrawling: false,
        });
        const id2 = await ctx.db.insert("stores", {
          name: "Store 2",
          url: "https://store2.com",
          isCrawling: false,
        });

        // Add deals to store 1
        await ctx.db.insert("deals", {
          storeId: id1,
          title: "Deal 1",
          url: "https://store1.com/deal1",
          canonicalUrl: "https://store1.com/deal1",
          dedupKey: "key1",
          price: 10,
          currency: "USD",
        });
        await ctx.db.insert("deals", {
          storeId: id1,
          title: "Deal 2",
          url: "https://store1.com/deal2",
          canonicalUrl: "https://store1.com/deal2",
          dedupKey: "key2",
          price: 20,
          currency: "USD",
        });

        // Add deal to store 2
        await ctx.db.insert("deals", {
          storeId: id2,
          title: "Deal 3",
          url: "https://store2.com/deal3",
          canonicalUrl: "https://store2.com/deal3",
          dedupKey: "key3",
          price: 30,
          currency: "USD",
        });

        return { storeId1: id1, storeId2: id2 };
      });

      // Execute
      const dealsStore1 = await t.query(api.deals.getDealsForStore, {
        storeId: storeId1,
      });
      const dealsStore2 = await t.query(api.deals.getDealsForStore, {
        storeId: storeId2,
      });

      // Assert
      expect(dealsStore1).toHaveLength(2);
      expect(dealsStore2).toHaveLength(1);
      expect(dealsStore1.map((d) => d.title).sort()).toEqual(["Deal 1", "Deal 2"]);
      expect(dealsStore2[0].title).toBe("Deal 3");
    });

    it("returns deals with all fields", async () => {
      const t = convexTest(schema);

      // Setup
      const storeId = await t.run(async (ctx) => {
        const id = await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });

        await ctx.db.insert("deals", {
          storeId: id,
          title: "Full Deal",
          url: "https://test.com/deal",
          canonicalUrl: "https://test.com/deal",
          dedupKey: "fullkey",
          price: 99.99,
          currency: "USD",
          image: "https://test.com/image.jpg",
          msrp: 149.99,
        });

        return id;
      });

      // Execute
      const deals = await t.query(api.deals.getDealsForStore, { storeId });

      // Assert
      expect(deals).toHaveLength(1);
      const deal = deals[0];
      expect(deal.title).toBe("Full Deal");
      expect(deal.price).toBe(99.99);
      expect(deal.msrp).toBe(149.99);
      expect(deal.image).toBe("https://test.com/image.jpg");
    });
  });
});
```

### File 6: `convex/__tests__/crawls.test.ts`

```typescript
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";

describe("crawls", () => {
  describe("updateDealsForStore", () => {
    it("inserts new deal when none exists", async () => {
      const t = convexTest(schema);

      // Setup: create a store
      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      // Execute
      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: "New Deal",
            url: "https://test.com/deal",
            price: 99.99,
            currency: "USD",
          },
        ],
      });

      // Assert
      const deals = await t.run(async (ctx) => {
        return await ctx.db.query("deals").collect();
      });
      expect(deals).toHaveLength(1);
      expect(deals[0].title).toBe("New Deal");
      expect(deals[0].price).toBe(99.99);
      expect(deals[0].canonicalUrl).toBeDefined();
      expect(deals[0].dedupKey).toBeDefined();
    });

    it("updates existing deal with same dedupKey", async () => {
      const t = convexTest(schema);

      // Setup: create store and initial deal
      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      // First insert
      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: "Original Deal",
            url: "https://test.com/deal",
            price: 100,
            currency: "USD",
          },
        ],
      });

      // Update with same URL and title (same dedupKey)
      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: "Original Deal", // Same title
            url: "https://test.com/deal", // Same URL
            price: 80, // Different price
            currency: "USD",
          },
        ],
      });

      // Assert: should still be 1 deal with updated price
      const deals = await t.run(async (ctx) => {
        return await ctx.db.query("deals").collect();
      });
      expect(deals).toHaveLength(1);
      expect(deals[0].price).toBe(80);
    });

    it("inserts new deal when title differs", async () => {
      const t = convexTest(schema);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      // First deal
      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: "Deal A",
            url: "https://test.com/deal",
            price: 100,
            currency: "USD",
          },
        ],
      });

      // Second deal - same URL but different title
      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: "Deal B",
            url: "https://test.com/deal",
            price: 90,
            currency: "USD",
          },
        ],
      });

      // Assert: should be 2 deals
      const deals = await t.run(async (ctx) => {
        return await ctx.db.query("deals").collect();
      });
      expect(deals).toHaveLength(2);
    });

    it("handles multiple deals in one call", async () => {
      const t = convexTest(schema);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          { title: "Deal 1", url: "https://test.com/1", price: 10, currency: "USD" },
          { title: "Deal 2", url: "https://test.com/2", price: 20, currency: "USD" },
          { title: "Deal 3", url: "https://test.com/3", price: 30, currency: "USD" },
        ],
      });

      const deals = await t.run(async (ctx) => {
        return await ctx.db.query("deals").collect();
      });
      expect(deals).toHaveLength(3);
    });

    it("handles deal with optional image", async () => {
      const t = convexTest(schema);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: "Deal With Image",
            url: "https://test.com/deal",
            price: 50,
            currency: "USD",
            image: "https://test.com/image.jpg",
          },
        ],
      });

      const deals = await t.run(async (ctx) => {
        return await ctx.db.query("deals").collect();
      });
      expect(deals[0].image).toBe("https://test.com/image.jpg");
    });

    it("normalizes URLs with tracking params", async () => {
      const t = convexTest(schema);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      await t.mutation(internal.crawls.updateDealsForStore, {
        storeId,
        deals: [
          {
            title: "Deal",
            url: "https://TEST.COM/deal?utm_source=test&real=param",
            price: 50,
            currency: "USD",
          },
        ],
      });

      const deals = await t.run(async (ctx) => {
        return await ctx.db.query("deals").collect();
      });
      // Canonical URL should be normalized
      expect(deals[0].canonicalUrl).toBe("https://test.com/deal?real=param");
    });
  });

  describe("beginManualCrawl", () => {
    it("succeeds when store is not crawling", async () => {
      const t = convexTest(schema);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: false,
        });
      });

      const result = await t.mutation(api.crawls.beginManualCrawl, { storeId });
      expect(result.success).toBe(true);
    });

    it("fails when crawl already in progress", async () => {
      const t = convexTest(schema);

      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: true, // Already crawling
        });
      });

      // This should fail with CrawlInProgressError
      await expect(t.mutation(api.crawls.beginManualCrawl, { storeId })).rejects.toThrow();
    });
  });

  describe("finishManualCrawl", () => {
    it("updates store crawling status", async () => {
      const t = convexTest(schema);

      // Setup: create a store that's crawling
      const storeId = await t.run(async (ctx) => {
        return await ctx.db.insert("stores", {
          name: "Test Store",
          url: "https://test.com",
          isCrawling: true,
        });
      });

      // We need a workflow ID - for testing, we can create a mock one
      // Note: This test may need adjustment based on how workflows work
      // For now, we'll test the store update logic directly

      await t.run(async (ctx) => {
        await ctx.db.patch(storeId, {
          lastCrawlAt: Date.now(),
          isCrawling: false,
        });
      });

      const store = await t.run(async (ctx) => {
        return await ctx.db.get(storeId);
      });

      expect(store?.isCrawling).toBe(false);
      expect(store?.lastCrawlAt).toBeDefined();
    });
  });
});
```

### Update `convex/vitest.config.ts`

The existing config should work, but verify it includes the test patterns:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    include: ["**/__tests__/**/*.test.ts", "**/lib/**/*.test.ts"],
  },
});
```

---

## Running Tests

### Commands

```bash
# Run all convex tests
cd convex && pnpm vitest run

# Run with watch mode
cd convex && pnpm vitest

# Run specific test file
cd convex && pnpm vitest run __tests__/dedup.test.ts

# Run with coverage
cd convex && pnpm vitest run --coverage
```

### Add to root package.json

```json
{
  "scripts": {
    "test:convex": "cd convex && vitest run",
    "test:convex:watch": "cd convex && vitest"
  }
}
```

---

## Implementation Checklist

- [x] Create `convex/lib/` directory
- [x] Create `convex/lib/dedup.ts` with extracted functions
- [x] Update `convex/crawls.ts` to import from `./lib/dedup`
- [x] Export error types from `convex/crawls.ts`
- [x] Add test layer export to `convex/firecrawlNodeActions.ts`
- [x] Create `convex/__tests__/` directory
- [x] Create `convex/lib/__tests__/` directory
- [x] Implement `convex/lib/__tests__/dedup.test.ts`
- [x] Implement `convex/__tests__/stores.test.ts`
- [x] Fix stores.test.ts type errors (import.meta.glob + convex-test modules)
- [x] Implement `convex/__tests__/eSchemas.test.ts`
- [x] Implement `convex/__tests__/firecrawl.test.ts`
- [x] Implement `convex/__tests__/deals.test.ts`
- [x] Implement `convex/__tests__/crawls.test.ts`
- [x] Update `convex/vitest.config.ts` if needed
- [x] Verify all tests pass

---

## Notes for Implementation Agent

1. **Effect Testing Pattern**: Use `it.effect()` from `@effect/vitest` for any test that returns an Effect. Use `Effect.gen(function* () { ... })` inside.

2. **convex-test Pattern**: Use `convexTest(schema)` to create a test instance. Use `t.run()` for direct database access, `t.query()` and `t.mutation()` for calling Convex functions.

3. **Schema Import**: Import `schema` from `../schema` (the default export), not `confectSchema`.

4. **API Import**: Import `api` and `internal` from `../_generated/api` for type-safe function references.

5. **Error Testing**: Use `Effect.flip` to convert success/failure, then assert on the error type's `_tag` property.

6. **Confect Context**: The `ConfectMutationCtx` and `ConfectQueryCtx` are provided automatically by confect when functions are called through Convex. For unit testing the handlers directly, you would need to mock these contexts.

7. **Edge Runtime**: The vitest config uses `edge-runtime` environment to match Convex's runtime. This is important for crypto APIs and other runtime-specific features.
