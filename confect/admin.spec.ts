import { GroupSpec } from "@confect/core";

import { sourcesSpec } from "./admin/sources.spec";

export const adminSpec = GroupSpec.make("admin").addGroup(sourcesSpec);
