import { Impl } from "@confect/server";
import { Layer } from "effect";

import nodeApi from "./_generated/nodeApi";
import { firecrawlNodeActions } from "./nodeImpl/firecrawlNodeActions";

export default Impl.make(nodeApi).pipe(Layer.provide(firecrawlNodeActions), Impl.finalize);
