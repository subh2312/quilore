import { UAT_MOCK_RECEIPT } from './config';
import { apiRequest, ApiClientError } from './client';
import { getStoredUserId } from './authStorage';
import type { BillingPurchaseRequest, EntitlementState } from './types';

export async function fetchEntitlements(userId?: string): Promise<EntitlementState | null> {
  const id = userId ?? (await getStoredUserId());
  if (!id) return null;
  try {
    return await apiRequest<EntitlementState>(`/api/entitlements/${id}`);
  } catch (err) {
    if (err instanceof ApiClientError && (err.status === 401 || err.status === 404)) {
      return null;
    }
    throw err;
  }
}

/** Mock IAP purchase — POST /api/billing/purchase (cursor contract + UAT_MOCK_RECEIPT). */
export async function mockPurchase(productId: string): Promise<EntitlementState> {
  const body: BillingPurchaseRequest = {
    productId,
    receipt: UAT_MOCK_RECEIPT,
    platform: 'mock',
  };
  try {
    return await apiRequest<EntitlementState>('/api/billing/purchase', { method: 'POST', body });
  } catch (err) {
    if (err instanceof ApiClientError && err.endpointUnavailable) {
      const userId = (await getStoredUserId()) ?? 'uat-user';
      return {
        userId,
        plan: 'PREMIUM',
        features: {
          workout_logging: true,
          meal_logging: true,
          ai_meal_scan: true,
          ai_advanced_coaching: true,
        },
        quotas: {},
        historicalDataAccess: true,
      };
    }
    throw err;
  }
}

/** Mock IAP restore — POST /api/billing/restore. */
export async function mockRestorePurchases(): Promise<EntitlementState> {
  try {
    return await apiRequest<EntitlementState>('/api/billing/restore', {
      method: 'POST',
      body: { receipt: UAT_MOCK_RECEIPT, platform: 'mock' },
    });
  } catch (err) {
    if (err instanceof ApiClientError && err.endpointUnavailable) {
      return mockPurchase('premium_monthly');
    }
    throw err;
  }
}
