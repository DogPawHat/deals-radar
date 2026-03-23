import { Spec } from "@confect/core";

import { adminSpec } from "./spec/admin";
import { crawlJobsSpec } from "./spec/crawlJobs";
import { crawlsSpec } from "./spec/crawls";
import { dealsSpec } from "./spec/deals";
import { priceHistorySpec } from "./spec/priceHistory";
import { publicDealsSpec } from "./spec/publicDeals";
import { storesSpec } from "./spec/stores";

export default Spec.make()
  .add(adminSpec)
  .add(crawlJobsSpec)
  .add(crawlsSpec)
  .add(dealsSpec)
  .add(priceHistorySpec)
  .add(publicDealsSpec)
  .add(storesSpec);
