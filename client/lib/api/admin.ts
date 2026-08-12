import { apiRequest } from './client';
import type { FoodAliasListResponse, FoodAliasReview } from './types';

export async function listFoodAliases(): Promise<FoodAliasListResponse> {
  return apiRequest<FoodAliasListResponse>('/api/admin/food-aliases');
}

export async function enqueueFoodAlias(rawName: string, candidateCode: string): Promise<FoodAliasReview> {
  return apiRequest<FoodAliasReview>('/api/admin/food-aliases', {
    method: 'POST',
    body: { rawName, candidateCode },
  });
}
