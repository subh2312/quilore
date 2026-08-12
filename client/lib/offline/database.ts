/**
 * WatermelonDB SQLite adapter — used in dev client / release APK, not Jest.
 */

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { offlineSchema } from './schema';
import { modelClasses } from './models';

let database: Database | null = null;

export function getWatermelonDatabase(): Database | null {
  if (database) return database;
  try {
    const adapter = new SQLiteAdapter({
      schema: offlineSchema,
      dbName: 'quilore_offline',
      jsi: true,
    });
    database = new Database({ adapter, modelClasses });
    return database;
  } catch {
    return null;
  }
}

export function resetWatermelonForTests() {
  database = null;
}
