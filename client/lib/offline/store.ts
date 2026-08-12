/**
 * Offline-first local cache + mutation queue (WatermelonDB + sync to Spring Boot).
 * Jest uses in-memory backend; native builds persist via SQLite.
 */

import { getWatermelonDatabase } from "./database";
import { SyncQueueRecord, WorkoutRecord } from "./models";
import * as memory from "./memoryStore";

export const LOCAL_SCHEMA_VERSION = memory.LOCAL_SCHEMA_VERSION;
export type PendingMutation = memory.PendingMutation;

const COLLECTION_TABLE: Record<string, string> = {
  workouts: "workouts",
  meals: "meals",
  plans: "plans",
};

function isMemoryOnly() {
  return process.env.JEST_WORKER_ID !== undefined;
}

async function persistRow(collection: string, id: string, row: Record<string, unknown>, enqueue: boolean) {
  const db = getWatermelonDatabase();
  if (!db || isMemoryOnly()) return;
  const table = COLLECTION_TABLE[collection];
  if (!table) return;
  const payloadJson = JSON.stringify({ id, ...row });
  const now = Date.now();
  await db.write(async () => {
    const records = await db.get(table).query().fetch();
    const existing = records.find((r) => r.id === id);
    if (existing) {
      await existing.update((rec) => {
        (rec as unknown as WorkoutRecord).payloadJson = payloadJson;
        (rec as unknown as WorkoutRecord).updatedAt = now;
      });
    } else {
      await db.get(table).create((rec) => {
        rec._raw.id = id;
        (rec as unknown as WorkoutRecord).payloadJson = payloadJson;
        (rec as unknown as WorkoutRecord).updatedAt = now;
      });
    }
    if (enqueue) {
      await db.get<SyncQueueRecord>("sync_queue").create((rec) => {
        rec.collectionName = collection;
        rec.op = "create";
        rec.payloadJson = payloadJson;
        rec.createdAt = now;
      });
    }
  });
}

export function resetOfflineStore() {
  memory.resetOfflineStore();
}

export function upsertLocal(collection: string, id: string, row: Record<string, unknown>, enqueue = true) {
  memory.upsertLocal(collection, id, row, enqueue);
  if (!isMemoryOnly()) {
    void persistRow(collection, id, row, enqueue).catch(() => undefined);
  }
}

export function listLocal(collection: string) {
  return memory.listLocal(collection);
}

export function pendingMutations(): PendingMutation[] {
  return memory.pendingMutations();
}

export function markSynced(mutationIds: string[]) {
  memory.markSynced(mutationIds);
}

export function migrateIfNeeded(fromVersion: number) {
  return memory.migrateIfNeeded(fromVersion);
}

export function getOfflineSnapshot() {
  return memory.getOfflineSnapshot();
}

export function isMemoryBackend() {
  return isMemoryOnly() || getWatermelonDatabase() === null;
}

export async function hydrateFromDatabase() {
  const db = getWatermelonDatabase();
  if (!db || isMemoryOnly()) return;
  memory.resetOfflineStore();
  for (const [collection, table] of Object.entries(COLLECTION_TABLE)) {
    const rows = await db.get(table).query().fetch();
    for (const row of rows) {
      const payload = JSON.parse((row as unknown as WorkoutRecord).payloadJson) as Record<string, unknown>;
      const id = String(payload.id ?? row.id);
      memory.upsertLocal(collection, id, payload, false);
    }
  }
  const queue = await db.get<SyncQueueRecord>("sync_queue").query().fetch();
  for (const item of queue) {
    memory.enqueuePending({
      id: item.id,
      collection: item.collectionName,
      op: item.op as PendingMutation["op"],
      payload: JSON.parse(item.payloadJson),
      createdAt: new Date(item.createdAt).toISOString(),
    });
  }
}
