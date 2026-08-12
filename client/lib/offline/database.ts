/**
 * WatermelonDB SQLite adapter — lazy-loaded in native builds only (not Jest).
 */

import type { Database } from "@nozbe/watermelondb";

let db: Database | null = null;

export function getWatermelonDatabase(): Database | null {
  if (process.env.JEST_WORKER_ID !== undefined) return null;
  if (db) return db;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Database: WMDatabase } = require("@nozbe/watermelondb");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SQLiteAdapter = require("@nozbe/watermelondb/adapters/sqlite").default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { schema } = require("./schema");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MealRecord, PlanRecord, SyncQueueRecord, WorkoutRecord } = require("./models");
    const adapter = new SQLiteAdapter({ schema, jsi: false, dbName: "quilore" });
    db = new WMDatabase({
      adapter,
      modelClasses: [WorkoutRecord, MealRecord, PlanRecord, SyncQueueRecord],
    });
    return db;
  } catch {
    return null;
  }
}
