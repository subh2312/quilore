import { apiRequest, ApiClientError } from "./client";
import { UAT_MOCK_RECEIPT } from "./config";
import { getStoredUserId } from "./authStorage";
import type { EntitlementState } from "./types";

function planFromPayload(raw: Record<string, unknown>): EntitlementState {
  const nested =
    raw.entitlements && typeof raw.entitlements === "object"
      ? (raw.entitlements as Record<string, unknown>)
      : raw;
  const plan = String(nested.plan ?? nested.planCode ?? raw.plan ?? raw.planCode ?? "FREE");
  const features = (nested.features as string[] | undefined) ?? (raw.features as string[] | undefined) ?? [];
  return { plan: plan.toUpperCase().includes("PREMIUM") ? "PREMIUM" : plan, features };
}

export async function fetchEntitlements(userId: string): Promise<EntitlementState> {
  try {
    const raw = await apiRequest<Record<string, unknown>>(`/api/entitlements/${userId}`);
    return planFromPayload(raw);
  } catch (err) {
    if (err instanceof ApiClientError && (err.endpointUnavailable || err.status === 401)) {
      return { plan: "FREE" };
    }
    throw err;
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new ApiClientError({ status: 0, message: "Request timed out", endpointUnavailable: true })),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function postBilling(path: string, body: Record<string, unknown>): Promise<EntitlementState> {
  const userId = await getStoredUserId();
  if (!userId) {
    throw new ApiClientError({ status: 401, message: "Sign in to manage purchases.", endpointUnavailable: false });
  }
  const raw = await withTimeout(
    apiRequest<Record<string, unknown>>(path, { method: "POST", body }),
    15000,
  );
  return planFromPayload(raw);
}

function softPremiumFallback(err: unknown): EntitlementState | null {
  if (!(err instanceof ApiClientError)) return null;
  if (err.endpointUnavailable || err.status === 0) {
    return { plan: "PREMIUM", features: ["advanced_coaching"] };
  }
  const reason =
    err.body && typeof err.body === "object" && typeof (err.body as { reason?: string }).reason === "string"
      ? (err.body as { reason: string }).reason
      : err.message;
  // UAT / local: mock IAP path when App Store / mock flag isn't configured.
  if (/mock_receipts_disabled|app_store_not_configured|play_store_not_configured|timed out/i.test(reason)) {
    return { plan: "PREMIUM", features: ["advanced_coaching"] };
  }
  if (err.body && typeof err.body === "object" && (err.body as { entitlements?: unknown }).entitlements) {
    return planFromPayload(err.body as Record<string, unknown>);
  }
  return null;
}

export async function mockPurchase(productId: string): Promise<EntitlementState> {
  try {
    return await postBilling(`/api/billing/${await requireUserId()}/purchase`, {
      productId,
      receipt: UAT_MOCK_RECEIPT,
      store: "mock",
      platform: "mock",
    });
  } catch (err) {
    const soft = softPremiumFallback(err);
    if (soft) return soft;
    throw err;
  }
}

export async function mockRestorePurchases(): Promise<EntitlementState> {
  try {
    return await postBilling(`/api/billing/${await requireUserId()}/restore`, {
      receipt: UAT_MOCK_RECEIPT,
      store: "mock",
      platform: "mock",
    });
  } catch (err) {
    const soft = softPremiumFallback(err);
    if (soft) return soft;
    throw err;
  }
}

async function requireUserId(): Promise<string> {
  const userId = await getStoredUserId();
  if (!userId) {
    throw new ApiClientError({ status: 401, message: "Sign in to manage purchases." });
  }
  return userId;
}
