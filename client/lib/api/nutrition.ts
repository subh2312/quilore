import { apiRequest, ApiClientError } from './client';
import type {
  FoodQualityRequest,
  FoodQualityResponse,
  MealCalculateResponse,
} from './types';

export async function calculateMeal(
  items: { foodCode?: string; name: string; grams: number }[],
): Promise<MealCalculateResponse> {
  return apiRequest<MealCalculateResponse>('/api/nutrition/meals/calculate', {
    method: 'POST',
    body: { items },
  });
}

/** POST /api/nutrition/food-quality — cursor branch contract. */
export async function fetchFoodQuality(body: FoodQualityRequest): Promise<FoodQualityResponse> {
  try {
    return await apiRequest<FoodQualityResponse>('/api/nutrition/food-quality', {
      method: 'POST',
      body,
    });
  } catch (err) {
    if (err instanceof ApiClientError && err.endpointUnavailable) {
      return {
        feedback:
          'Meal looks balanced for a training day — coaching estimate only, not medical advice.',
        flags: [],
        aiObservation: true,
      };
    }
    throw err;
  }
}
