import Firecrawl from "@mendable/firecrawl-js";
import { Context, Effect, JSONSchema, Layer, Match, Config, Redacted, Schema } from "effect";
import { ParseError } from "effect/ParseResult";

import {
  AgentJob,
  AgentState,
  AgentStateCompleted,
  AgentStateFailed,
  AgentStatePending,
  DealExtractions,
} from "./schemas";

const extractDealsPrompt = `
  You are a helpful assistant that extracts deals from a web store.
  You will be given a web store and you will need to extract the deals from the store.
  Return the deals in an array of objects as per the schema you were given.
`;

export class FirecrawlClientErrorInit extends Schema.TaggedError<FirecrawlClientErrorInit>()(
  "FirecrawlClientInitError",
  {
    message: Schema.String,
    error: Schema.Defect,
  },
) {}

export class FirecrawlApiErrorAgentStatus extends Schema.TaggedError<FirecrawlApiErrorAgentStatus>()(
  "FirecrawlApiErrorAgentStatus",
  {
    message: Schema.String,
    jobId: Schema.String,
    error: Schema.Defect,
  },
) {}

export class FirecrawlApiErrorStartAgent extends Schema.TaggedError<FirecrawlApiErrorStartAgent>()(
  "FirecrawlApiErrorStartAgent",
  {
    message: Schema.String,
    error: Schema.Defect,
  },
) {}

export class FirecrawlOperationsContext extends Context.Tag(
  "deals-radar/confect/FirecrawlOperationsContext",
)<
  FirecrawlOperationsContext,
  {
    readonly getAgentStatus: (
      jobId: string,
    ) => Effect.Effect<AgentState, FirecrawlApiErrorAgentStatus | ParseError>;
    readonly startAgent: (
      urls: readonly string[],
    ) => Effect.Effect<AgentJob, FirecrawlApiErrorStartAgent>;
  }
>() {
  static readonly layer = Layer.effect(
    FirecrawlOperationsContext,
    Effect.gen(function* () {
      const apiKey = yield* Config.redacted("FIRECRAWL_API_KEY");
      const client = yield* Effect.try({
        try: () => new Firecrawl({ apiKey: Redacted.value(apiKey) }),
        catch: (error) =>
          FirecrawlClientErrorInit.make({
            message: "Failed to initialize Firecrawl client",
            error,
          }),
      });

      const getAgentStatus = Effect.fn("getAgentStatus")(function* (jobId: string) {
        const response = yield* Effect.tryPromise({
          try: () => client.getAgentStatus(jobId),
          catch: (error) =>
            FirecrawlApiErrorAgentStatus.make({
              message: `Failed to get extract status for job id: ${jobId}`,
              jobId,
              error,
            }),
        });

        return yield* Match.value(response).pipe(
          Match.when({ status: "completed" }, (value) =>
            Schema.decodeUnknown(AgentStateCompleted)({
              data: value?.data,
              expiresAt: value?.expiresAt,
            }),
          ),
          Match.when({ status: "processing" }, (value) =>
            Schema.decodeUnknown(AgentStatePending)({
              expiresAt: value?.expiresAt,
            }),
          ),
          Match.when({ status: "failed" }, (value) =>
            Schema.decodeUnknown(AgentStateFailed)({
              errorMessage: value?.error,
              expiresAt: value?.expiresAt,
            }),
          ),
          Match.exhaustive,
        );
      });

      const startAgent = Effect.fn("startAgent")(function* (urls: readonly string[]) {
        return yield* Effect.tryPromise({
          try: async () => {
            const jsonSchema = JSONSchema.make(DealExtractions) as unknown as Record<
              string,
              unknown
            >;
            const response = await client.startAgent({
              urls: [...urls],
              prompt: extractDealsPrompt,
              schema: jsonSchema,
            });

            return new AgentJob({ jobId: response.id });
          },
          catch: (error) =>
            FirecrawlApiErrorStartAgent.make({
              message: "Agent failed to start",
              error,
            }),
        });
      });

      return FirecrawlOperationsContext.of({
        getAgentStatus,
        startAgent,
      });
    }),
  );
}

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
