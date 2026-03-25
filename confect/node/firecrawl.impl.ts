import { FunctionImpl, GroupImpl } from "@confect/server";
import { Effect, Layer } from "effect";

import nodeApi from "../_generated/nodeApi";
import { FirecrawlOperationsContext } from "../lib/firecrawl";

const startAgent = FunctionImpl.make(nodeApi, "firecrawlNodeActions", "startAgent", ({ urls }) =>
  Effect.gen(function* () {
    const firecrawl = yield* FirecrawlOperationsContext;
    const job = yield* firecrawl.startAgent(urls).pipe(Effect.orDie);
    return { jobId: job.jobId };
  }).pipe(Effect.provide(FirecrawlOperationsContext.layer.pipe(Layer.orDie))),
);

const getAgentData = FunctionImpl.make(
  nodeApi,
  "firecrawlNodeActions",
  "getAgentData",
  ({ jobId }) =>
    Effect.gen(function* () {
      const firecrawl = yield* FirecrawlOperationsContext;
      return yield* firecrawl.getAgentStatus(jobId).pipe(Effect.orDie);
    }).pipe(Effect.provide(FirecrawlOperationsContext.layer.pipe(Layer.orDie))),
);

export const firecrawlNodeActions = GroupImpl.make(nodeApi, "firecrawlNodeActions").pipe(
  Layer.provide(startAgent),
  Layer.provide(getAgentData),
);
