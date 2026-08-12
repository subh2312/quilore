import { apiRequest, ApiClientError } from "./client";
import { UAT_MOCK_RECEIPT } from "./config";
import { getStoredUserId } from "./authStorage";
import type { EntitlementState } from "./types";

export async function fetchEntitlements(userId: string): Promise<EntitlementState> {
  try {
    const raw = await apiRequest<Record<string, unknown>>(`/api/entitlements/${userId}`);
    const plan = String(raw.plan ?? raw.planCode ?? "FREE");
    return { plan, features: (raw.features as string[] | undefined) ?? [] };
  } catch (err) {
    if (err instanceof ApiClientError && err.endpointUnavailable) return { plan: "FREE" };
    throw err;
  }
}

async function postBilling(path: string, body: Record<string, unknown>): Promise<EntitlementState> {
  const userId = await getStoredUserId();
  if (!userId) throw new ApiClientError({ status: 401, message: "Not signed in", endpointUnavailable: true });
  const raw = await apiRequest<Record<string, unknown>>(path, { method: "POST", body });
  const plan = String(raw.plan ?? raw.planCode ?? "PREMIUM");
  return { plan, features: (raw.features as string[] | undefined) ?? [] };
}

export async function mockPurchase(productId: string): Promise<EntitlementState> {
  const userId = await getStoredUserId();
  try {
    if (!userId) throw new ApiClientError({ status: 401, message: "offline", endpointUnavailable: true });
    return await postBilling(`/api/billing/${userId}/purchase`, { productId, receipt: UAT_MOCK_RECEIPT });
  } catch (err) {
    if (err instanceof ApiClientError && err.endpointUnavailable) return { plan: "PREMIUM", features: ["advanced_coaching"] };
    throw err;
  }
}

export async function mockRestorePurchases(): Promise<EntitlementState> {
  const userId = await getStoredUserId();
  try {
    if (!userId) throw new ApiClientError({ status: 401, message: "offline", endpointUnavailable: true });
    return await postBilling(`/api/billing/${userId}/restore`, { receipt: UAT_MOCK_RECEIPT });
  } catch (err) {
    if (err instanceof ApiClientError && err.endpointUnavailable) return { plan: "PREMIUM", features: ["advanced_coaching"] };
    throw err;
  }
}
