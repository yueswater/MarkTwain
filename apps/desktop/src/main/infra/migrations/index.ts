import type { Migration } from "../migrate";
import { init } from "./001-init";
import { versioning } from "./002-versioning";
import { engine } from "./003-engine";

/** Append new migrations at the end with consecutive versions, migrate checks that. */
export const MIGRATIONS: Migration[] = [init, versioning, engine];
