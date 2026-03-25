import { Impl } from "@confect/server";
import { Layer } from "effect";

import api from "./_generated/api";
import { admin } from "./admin.impl.js";
import { crawlJobs } from "./crawlJobs.impl.js";
import { crawls } from "./crawls.impl.js";
import { deals } from "./deals.impl.js";
import { priceHistory } from "./priceHistory.impl.js";
import { publicDeals } from "./publicDeals.impl.js";
import { stores } from "./stores.impl.js";
import { workflows } from "./workflows.impl.js";

export default Impl.make(api).pipe(
  Layer.provide(admin),
  Layer.provide(crawlJobs),
  Layer.provide(crawls),
  Layer.provide(deals),
  Layer.provide(priceHistory),
  Layer.provide(publicDeals),
  Layer.provide(stores),
  Layer.provide(workflows),
  Impl.finalize,
);
