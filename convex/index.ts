// convex/index.ts
import { WorkflowManager } from "@convex-dev/workflow";
import { components } from "./_generated/api";
import "./publicDeals";
import "./crawlJobs";

export const workflow = new WorkflowManager(components.workflow);
