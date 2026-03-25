import { Spec } from "@confect/core";

import { firecrawlNodeActionsSpec } from "./node/firecrawl.spec";

export default Spec.makeNode().add(firecrawlNodeActionsSpec);
