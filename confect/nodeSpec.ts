import { Spec } from "@confect/core";

import { firecrawlNodeActionsSpec } from "./nodeSpec/firecrawlNodeActions";

export default Spec.makeNode().add(firecrawlNodeActionsSpec);
