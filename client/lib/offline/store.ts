/**
 * Offline-first local cache + mutation queue (Story 12.1 / WatermelonDB-shaped).
 * In-memory + serializable store for Jest/Expo without native Watermelon binding.
 */

import { MealRecord, PlanRecord, SyncQueueRecord, WorkoutRecord } from './models';

export const LOCAL_SCHEMA_VERSION = 1;

export type PendingMutation = {
  id: string;
  collection: string;
  op: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  createdAt: string;
};

type Collection = Record<string, Record<string, unknown>>;

type Snapshot = {
  schemaVersion: number;
  collections: Record<string, Collection>;
  pending: PendingMutation[];
  lastSyncAt: string | null;
};

let state: Snapshot = {
  schemaVersion: LOCAL_SCHEMA_VERSION,
  collections: { workouts: {}, meals: {}, plans: {} },
  pending: [],
  lastSyncAt: null,
};

export function resetOfflineStore() {
  state = {
    schemaVersion: LOCAL_SCHEMA_VERSION,
    collections: { workouts: {}, meals: {}, plans: {} },
    pending: [],
    lastSyncAt: null,
  };
}

export function upsertLocal(collection: string, id: string, row: Record<string, unknown>, enqueue = true) {
  if (!state.collections[collection]) state.collections[collection] = {};
  state.collections[collection][id] = { ...row, id };
  if (enqueue) {
    state.pending.push({
      id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      collection,
      op: 'create',
      payload: { id, ...row },
      createdAt: new Date().toISOString(),
    });
  }
}

export function listLocal(collection: string) {
  return Object.values(state.collections[collection] ?? {});
}

export function pendingMutations() {
  return [...state.pending];
}

export function markSynced(mutationIds: string[]) {
  const drop = new Set(mutationIds);
  state.pending = state.pending.filter((m) => !drop.has(m.id));
  state.lastSyncAt = new Date().toISOString();
}

export function migrateIfNeeded(fromVersion: number) {
  if (fromVersion >= LOCAL_SCHEMA_VERSION) return state.schemaVersion;
  if (!state.collections.plans) state.collections.plans = {};
  state.schemaVersion = LOCAL_SCHEMA_VERSION;
  return state.schemaVersion;
}

export function getOfflineSnapshot(): Snapshot {
  return JSON.parse(JSON.stringify(state));
}

/** Load persisted rows from WatermelonDB into the in-memory cache when available. */
export async function hydrateFromDatabase(): Promise<void> {
  try {
    const { getWatermelonDatabase } = await import('./database');
    const db = getWatermelonDatabase();
    if (!db) return;

    const loadCollection = async (collection: string, rows: WorkoutRecord[] | MealRecord[] | PlanRecord[]) => {
      for (const row of rows) {
        const payload = JSON.parse(row.payloadJson) as Record<string, unknown>;
        const id = row.remoteId ?? row.id;
        upsertLocal(collection, id, payload, false);
      }
    };

    await loadCollection('workouts', await db.get('workouts').query().fetch() as WorkoutRecord[]);
    await loadCollection('meals', await db.get('meals').query().fetch() as MealRecord[]);
    await loadCollection('plans', await db.get('plans').query().fetch() as PlanRecord[]);

    const queue = await db.get('sync_queue').query().fetch();
    for (const rec of queue) {
      const row = rec as SyncQueueRecord;
      state.pending.push({
        id: row.id,
        collection: row.collectionName,
        op: row.op as PendingMutation['op'],
        payload: JSON.parse(row.payloadJson) as Record<string, unknown>,
        createdAt: new Date(row.createdAt).toISOString(),
      });
    }
  } catch {
    // Native SQLite unavailable (Jest, web, Expo Go without dev client).
  }
}
