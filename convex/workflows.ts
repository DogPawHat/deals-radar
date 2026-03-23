import { v } from "convex/values";
import { internal } from "./_generated/api";
import { workflow } from "./index";

export const extractSourceWorkflow = workflow.define({
  args: {
    store: v.object({
      _id: v.id("stores"),
      url: v.string(),
    }),
  },
  handler: async (step, args): Promise<void> => {
    const job = await step.runAction(internal.node.firecrawlNodeActions.startAgent, {
      urls: [args.store.url],
    });

    let attempts = 0;
    let data: unknown = null;
    while (attempts < 10 && data == null) {
      attempts++;
      const result = await step.runAction(internal.node.firecrawlNodeActions.getAgentData, {
        jobId: job.jobId,
      });
      if (result._tag === "AgentStateCompleted") {
        data = (result as { data: unknown }).data;
      } else {
        throw new Error("Firecrawl extraction failed");
      }
    }

    if (data == null) {
      throw new Error("Firecrawl extraction timed out");
    }

    await step.runMutation(internal.crawls.updateDealsForStore, {
      storeId: args.store._id,
      deals: data as Array<{
        title: string;
        url: string;
        image?: string;
        price: number;
        currency: string;
        msrp?: number;
        percentOff?: number;
      }>,
    });
  },
});
