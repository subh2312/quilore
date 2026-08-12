import { apiRequest, ApiClientError } from "./client";
import { getStoredUserId } from "./authStorage";
import { markSynced, pendingMutations } from "../offline/store";

export async function pushPendingMutations(): Promise<{ applied: number }> {
  const userId = await getStoredUserId();
  const mutations = pendingMutations();
  if (mutations.length === 0) return { applied: 0 };
  try {
    if (!userId) throw new ApiClientError({ status: 401, message: "offline", endpointUnavailable: true });
    await apiRequest(`/api/sync/${userId}/push`, {
      method: "POST",
      body: {
        mutations: mutations.map((m) => ({
          id: m.id,
          collection: m.collection,
          op: m.op,
          payload: m.payload,
        })),
      },
    });
    markSynced(mutations.map((m) => m.id));
    return { applied: mutations.length };
  } catch (err) {
    if (err instanceof ApiClientError && err.endpointUnavailable) return { applied: 0 };
    throw err;
  }
}
