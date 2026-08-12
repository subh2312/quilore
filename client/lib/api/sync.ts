import { apiRequest } from './client';
import { getStoredUserId } from './authStorage';
import { pendingMutations } from '@/lib/offline/store';
import type { SyncPushResponse } from './types';

export async function pushPendingMutations(): Promise<SyncPushResponse | null> {
  const userId = await getStoredUserId();
  if (!userId) return null;

  const mutations = pendingMutations().map((m) => ({
    id: m.id,
    collection: m.collection,
    op: m.op,
    payload: m.payload,
    createdAt: m.createdAt,
  }));

  if (mutations.length === 0) return null;

  return apiRequest<SyncPushResponse>(`/api/sync/${userId}/push`, {
    method: 'POST',
    body: { mutations },
  });
}

export async function pullRemoteChanges(lastPulledAt = 0) {
  const userId = await getStoredUserId();
  if (!userId) return null;
  return apiRequest<{ changes: unknown[]; timestamp: number }>(
    `/api/sync/${userId}/pull?lastPulledAt=${lastPulledAt}`,
  );
}
