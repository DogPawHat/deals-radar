import { Impl } from "@confect/server";
import { Layer } from "effect";

import api from "./_generated/api";
import { admin } from "./impl/admin";
import { crawlJobs } from "./impl/crawlJobs";
import { crawls } from "./impl/crawls";
import { deals } from "./impl/deals";
import { priceHistory } from "./impl/priceHistory";
import { publicDeals } from "./impl/publicDeals";
import { stores } from "./impl/stores";

export default Impl.make(api).pipe(
  Layer.provide(admin),
  Layer.provide(crawlJobs),
  Layer.provide(crawls),
  Layer.provide(deals),
  Layer.provide(priceHistory),
  Layer.provide(publicDeals),
  Layer.provide(stores),
  Impl.finalize,
);
