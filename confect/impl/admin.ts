import { GroupImpl } from "@confect/server";
import { Layer } from "effect";

import api from "../_generated/api";
import { sources } from "./admin/sources";

export const admin = GroupImpl.make(api, "admin").pipe(Layer.provide(sources));
