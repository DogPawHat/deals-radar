import { describe, it, expect, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import {
  AgentStateCompleted,
  AgentStatePending,
  AgentStateFailed,
  AgentJob,
  DealExtraction,
} from "../eSchemas";
import {
  FirecrawlOperationsContext,
  FirecrawlApiErrorStartAgent,
  FirecrawlApiErrorAgentStatus,
  FirecrawlTestLayer,
} from "../firecrawlNodeActions";

const testDeal = new DealExtraction({
  title: "Test Deal",
  url: "https://example.com/deal",
  price: 99.99,
  currency: "USD",
});

describe("FirecrawlOperationsContext", () => {
  describe("startAgent", () => {
    layer(FirecrawlTestLayer)("returns test job id", (it) => {
      it.effect("startAgent returns job id", () =>
        Effect.gen(function* () {
          const ctx = yield* FirecrawlOperationsContext;
          const job = yield* ctx.startAgent(["https://example.com"]);
          expect(job.jobId).toBe("test-job-id");
        }),
      );
    });
  });

  describe("getAgentStatus", () => {
    layer(FirecrawlTestLayer)("returns completed with empty data", (it) => {
      it.effect("getAgentStatus returns completed state", () =>
        Effect.gen(function* () {
          const ctx = yield* FirecrawlOperationsContext;
          const status = yield* ctx.getAgentStatus("job-123");
          expect(status._tag).toBe("AgentStateCompleted");
          if (status._tag === "AgentStateCompleted") {
            expect(status.data).toHaveLength(0);
          }
        }),
      );
    });
  });

  describe("with completed response", () => {
    const CompletedLayer = Layer.succeed(FirecrawlOperationsContext, {
      getAgentStatus: (_jobId: string) =>
        Effect.succeed(
          AgentStateCompleted.make({
            data: [testDeal],
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
          if (status._tag === "AgentStateCompleted" && status.data[0]) {
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
          AgentStatePending.make({
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
          AgentStateFailed.make({
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
      getAgentStatus: (_jobId: string) =>
        Effect.fail(
          new FirecrawlApiErrorAgentStatus({
            message: "API Error",
            jobId: "test",
            error: null,
          }),
        ),
      startAgent: (_urls: readonly string[]) =>
        Effect.fail(
          new FirecrawlApiErrorStartAgent({
            message: "Failed to start agent",
            error: null,
          }),
        ),
    });

    layer(ErrorLayer)("error handling", (it) => {
      it.effect("startAgent error is catchable", () =>
        Effect.gen(function* () {
          const ctx = yield* FirecrawlOperationsContext;
          const error = yield* ctx.startAgent([]).pipe(Effect.flip);
          expect(error._tag).toBe("FirecrawlApiErrorStartAgent");
        }),
      );

      it.effect("getAgentStatus error is catchable", () =>
        Effect.gen(function* () {
          const ctx = yield* FirecrawlOperationsContext;
          const error = yield* ctx.getAgentStatus("job-error").pipe(Effect.flip);
          expect(error._tag).toBe("FirecrawlApiErrorAgentStatus");
        }),
      );
    });
  });
});
