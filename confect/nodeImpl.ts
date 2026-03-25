import { Impl } from "@confect/server";
import { Layer } from "effect";

import nodeApi from "./_generated/nodeApi";
import { firecrawlNodeActions } from "./node/firecrawl.impl";

export default Impl.make(nodeApi).pipe(Layer.provide(firecrawlNodeActions), Impl.finalize);
