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

  it.effect("rejects negative percentOff", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(DealExtraction)({
        ...validDeal,
        percentOff: -10,
      }).pipe(Effect.flip);
      expect(result._tag).toBe("ParseError");
    }),
  );

  it.effect("accepts zero price", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(DealExtraction)({
        ...validDeal,
        price: 0,
      });
      expect(result.price).toBe(0);
    }),
  );

  it.effect("accepts zero msrp", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(DealExtraction)({
        ...validDeal,
        msrp: 0,
      });
      expect(result.msrp).toBe(0);
    }),
  );

  it.effect("accepts empty string title", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(DealExtraction)({
        ...validDeal,
        title: "",
      });
      expect(result.title).toBe("");
    }),
  );

  it.effect("rejects URL with only protocol", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(DealExtraction)({
        ...validDeal,
        url: "http://",
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

  it.effect("rejects array with invalid deal", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(DealExtractions)([
        { title: "A", url: "https://a.com", price: 10, currency: "USD" },
        { title: "B", url: "invalid", price: 20, currency: "EUR" },
      ]).pipe(Effect.flip);
      expect(result._tag).toBe("ParseError");
    }),
  );

  it.effect("accepts large array of deals", () =>
    Effect.gen(function* () {
      const deals = Array.from({ length: 100 }, (_, i) => ({
        title: `Product ${i}`,
        url: `https://example.com/product/${i}`,
        price: i * 10,
        currency: "USD",
      }));
      const result = yield* Schema.decodeUnknown(DealExtractions)(deals);
      expect(result).toHaveLength(100);
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

  it.effect("decodes AgentStateFailed (AgentStateError)", () =>
    Effect.gen(function* () {
      const result = yield* Schema.decodeUnknown(agentStateUnion)({
        _tag: "AgentStateError",
        errorMessage: "Something went wrong",
        expiresAt: "2024-01-01T00:00:00Z",
      });
      expect(result._tag).toBe("AgentStateError");
    }),
  );

  it.effect("AgentStateCompleted with empty data array", () =>
    Effect.gen(function* () {
      const completed = new AgentStateCompleted({
        data: [],
        expiresAt: "2024-12-31T23:59:59Z",
      });
      const result = yield* Schema.decodeUnknown(agentStateUnion)(completed);
      expect(result._tag).toBe("AgentStateCompleted");
      if (result._tag === "AgentStateCompleted") {
        expect(result.data).toHaveLength(0);
      }
    }),
  );

  it.effect("AgentStateFailed contains errorMessage", () =>
    Effect.gen(function* () {
      const failed = new AgentStateFailed({
        errorMessage: "Extraction failed",
        expiresAt: "2024-12-31T23:59:59Z",
      });
      const result = yield* Schema.decodeUnknown(agentStateUnion)(failed);
      expect(result._tag).toBe("AgentStateError");
      if (result._tag === "AgentStateError") {
        expect(result.errorMessage).toBe("Extraction failed");
      }
    }),
  );

  it.effect("AgentStatePending contains only expiresAt", () =>
    Effect.gen(function* () {
      const pending = new AgentStatePending({
        expiresAt: "2024-12-31T23:59:59Z",
      });
      const result = yield* Schema.decodeUnknown(agentStateUnion)(pending);
      expect(result._tag).toBe("AgentStatePending");
      if (result._tag === "AgentStatePending") {
        expect(result.expiresAt).toBe("2024-12-31T23:59:59Z");
      }
    }),
  );
});
