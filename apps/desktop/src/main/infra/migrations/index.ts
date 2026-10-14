import type { Migration } from "../migrate";
import { init } from "./001-init";

/** 新增 migration 時加在最後，版本號接續（migrate 會檢查是否連續）。 */
export const MIGRATIONS: Migration[] = [init];
