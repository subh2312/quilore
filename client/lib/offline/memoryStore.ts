/**
 * In-memory offline backend used by Jest and as WatermelonDB fallback.
 */

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

export function upsertLocal(
  collection: string,
  id: string,
  row: Record<string, unknown>,
  enqueue = true,
) {
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

export function enqueuePending(m: PendingMutation) {
  state.pending.push(m);
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

export function isMemoryBackend() {
  return true;
}
