import { Spec } from "@confect/core";

import { adminSpec } from "./admin.spec";
import { crawlJobsSpec } from "./crawlJobs.spec";
import { crawlsSpec } from "./crawls.spec";
import { dealsSpec } from "./deals.spec";
import { priceHistorySpec } from "./priceHistory.spec";
import { publicDealsSpec } from "./publicDeals.spec";
import { storesSpec } from "./stores.spec";
import { workflowsSpec } from "./workflows.spec";

export default Spec.make()
  .add(adminSpec)
  .add(crawlJobsSpec)
  .add(crawlsSpec)
  .add(dealsSpec)
  .add(priceHistorySpec)
  .add(publicDealsSpec)
  .add(storesSpec)
  .add(workflowsSpec);
