import { GroupSpec } from "@confect/core";

import { sourcesSpec } from "./admin/sources";

export const adminSpec = GroupSpec.make("admin").addGroup(sourcesSpec);
