import type { Migration } from "../migrate";
import { init } from "./001-init";

/** Append new migrations at the end with consecutive versions, migrate checks that. */
export const MIGRATIONS: Migration[] = [init];
