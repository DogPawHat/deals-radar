import { Effect } from "effect";
import { components } from "../convex/_generated/api.js";
import { defineWorkflow, WorkflowContext } from "confect-workflow/server";

import { AgentStateCompleted } from "./lib/schemas.js";
import refs from "./_generated/refs";
import { extractSourceWorkflow } from "./workflows.spec";

type WorkflowContextType = WorkflowContext extends { Type: infer T } ? T : never;
type ExtractedDeals = typeof AgentStateCompleted.fields.data.Type;

export const extractSourceWorkflowDefinition = defineWorkflow(
  components.workflow,
  extractSourceWorkflow,
  {
    handler: (args) =>
      Effect.gen(function* () {
        const ctx: WorkflowContextType = yield* WorkflowContext;
        const job = yield* ctx.runAction(refs.internal.node.firecrawlNodeActions.startAgent, {
          urls: [args.store.url],
        });

        const pollAndProcess = (
          attempts: number,
          data: ExtractedDeals | null,
        ): Effect.Effect<null, Error, WorkflowContext> => {
          if (attempts >= 10 || data !== null) {
            if (data === null) {
              return Effect.fail(new Error("Firecrawl extraction timed out"));
            }

            return Effect.as(
              ctx.runMutation(refs.internal.crawls.updateDealsForStore, {
                storeId: args.store._id,
                deals: data,
              }),
              null,
            );
          }

          return Effect.flatMap(
            ctx.runAction(refs.internal.node.firecrawlNodeActions.getAgentData, {
              jobId: job.jobId,
            }),
            (result) => {
              if (result._tag === "AgentStateCompleted") {
                return pollAndProcess(10, result.data);
              }

              return Effect.fail(new Error("Firecrawl extraction failed"));
            },
          );
        };

        return yield* pollAndProcess(0, null);
      }),
  },
);
