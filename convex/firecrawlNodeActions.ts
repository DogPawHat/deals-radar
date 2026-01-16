"use node";

import Firecrawl from "@mendable/firecrawl-js";

import { internalAction } from "./confect";

import { Effect, JSONSchema, Context, Schema, Layer, Match, Config, Redacted } from "effect";
import {
  DealExtractions,
  AgentJob,
  AgentState,
  AgentStateFailed,
  AgentStateCompleted,
  AgentStatePending,
  agentStateUnion,
} from "./eSchemas";
import { ParseError } from "effect/ParseResult";

const extractDealsPrompt = `
  You are a helpful assistant that extracts deals from a web store.
  You will be given a web store and you will need to extract the deals from the store.
  Return the deals in an array of objects as per the schema you were given.
`;

class FirecrawlClientErrorInit extends Schema.TaggedError<FirecrawlClientErrorInit>()(
  "FirecrawlClientInitError",
  {
    message: Schema.String,
    error: Schema.Defect,
  },
) {}

class FirecrawlApiErrorAgentStatus extends Schema.TaggedError<FirecrawlApiErrorAgentStatus>()(
  "FirecrawlApiErrorAgentStatus",
  {
    message: Schema.String,
    jobId: Schema.String,
    error: Schema.Defect,
  },
) {}

class FirecrawlApiErrorStartAgent extends Schema.TaggedError<FirecrawlApiErrorStartAgent>()(
  "FirecrawlApiErrorStartAgent",
  {
    message: Schema.String,
    error: Schema.Defect,
  },
) {}

class FirecrawlOperationsContext extends Context.Tag(
  "deals-radar/convex/FirecrawlOperationsContext",
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
      const firecrawlClient = yield* Effect.try({
        try: () => new Firecrawl({ apiKey: Redacted.value(apiKey) }),
        catch: (unknown) =>
          FirecrawlClientErrorInit.make({
            error: unknown,
            message: "Failed to initialize Firecrawl client",
          }),
      });

      const getAgentStatus = Effect.fn("getAgentStatus")(
        function* (jobId: string) {
          return yield* Effect.tryPromise({
            try: () => firecrawlClient.getAgentStatus(jobId),
            catch: (unknown) =>
              FirecrawlApiErrorAgentStatus.make({
                message: `Failed to get extract status for job id: ${jobId}`,
                jobId,
                error: unknown,
              }),
          });
        },
        Effect.flatMap((response) =>
          Match.value(response).pipe(
            Match.when({ status: "completed" }, (mappedResponse) =>
              Schema.decodeUnknown(AgentStateCompleted)({
                data: mappedResponse?.data,
                expiresAt: mappedResponse?.expiresAt,
              }),
            ),
            Match.when({ status: "processing" }, (mappedResponse) =>
              Schema.decodeUnknown(AgentStatePending)({
                expiresAt: mappedResponse?.expiresAt,
              }),
            ),
            Match.when({ status: "failed" }, (mappedResponse) =>
              Schema.decodeUnknown(AgentStateFailed)({
                errorMessage: mappedResponse?.error,
                expiresAt: mappedResponse?.expiresAt,
              }),
            ),
            Match.exhaustive,
          ),
        ),
      );

      const startAgent = Effect.fn("startAgent")(function* (urls: readonly string[]) {
        return yield* Effect.tryPromise({
          try: async () => {
            // Need better json schema supoort in firecrawl
            const jsonSchema = JSONSchema.make(DealExtractions) as unknown as Record<
              string,
              unknown
            >;
            const response = await firecrawlClient.startAgent({
              urls: [...urls],
              prompt: extractDealsPrompt,
              schema: jsonSchema,
            });

            return new AgentJob({
              jobId: response.id,
            });
          },
          catch: (unknown) =>
            FirecrawlApiErrorStartAgent.make({
              error: unknown,
              message: "Agent failed to start",
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

class StartAgentArgs extends Schema.Struct({
  urls: Schema.Array(Schema.String),
}) {}

class StartAgentResult extends Schema.Struct({
  jobId: Schema.String,
}) {}

class GetAgentDataArgs extends Schema.Struct({
  jobId: Schema.String,
}) {}

export const startAgent = internalAction({
  args: StartAgentArgs,
  returns: StartAgentResult,
  handler: ({ urls }) =>
    Effect.gen(function* () {
      const firecrawlOperations = yield* FirecrawlOperationsContext;
      return yield* firecrawlOperations.startAgent(urls);
    }).pipe(Effect.provide(FirecrawlOperationsContext.layer)),
});

export const getAgentData = internalAction({
  args: GetAgentDataArgs,
  returns: agentStateUnion,
  handler: ({ jobId }) =>
    Effect.gen(function* () {
      const firecrawlOperations = yield* FirecrawlOperationsContext;
      return yield* firecrawlOperations.getAgentStatus(jobId);
    }).pipe(Effect.provide(FirecrawlOperationsContext.layer)),
});
