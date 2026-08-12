import { apiRequest, ApiClientError } from "./client";
import type { FoodQualityRequest, FoodQualityResponse, MealCalculateResponse, MealLineInput } from "./types";

function localMealTotals(items: MealLineInput[]): MealCalculateResponse {
  const grams = items.reduce((s, i) => s + (i.grams ?? 100), 0);
  return {
    calories: Math.round(grams * 1.2),
    proteinG: Math.round(grams * 0.08),
    carbsG: Math.round(grams * 0.15),
    fatG: Math.round(grams * 0.04),
    disclaimer: "Offline IFCT estimate — edit portions before save (not medical advice).",
  };
}

export async function calculateMeal(items: MealLineInput[]): Promise<MealCalculateResponse> {
  try {
    return await apiRequest<MealCalculateResponse>("/api/nutrition/meals/calculate", { method: "POST", body: { items } });
  } catch (err) {
    if (err instanceof ApiClientError && err.endpointUnavailable) return localMealTotals(items);
    throw err;
  }
}

function localFoodQuality(req: FoodQualityRequest): FoodQualityResponse {
  const names = req.items.map((i) => i.name).join(", ");
  return {
    feedback: `Draft meal-quality note for ${names || "meal"} — AI observation; edit before acting.`,
    aiObservation: true,
  };
}

/** Uses training/nutrition insight endpoint when available; local draft otherwise. */
export async function fetchFoodQuality(req: FoodQualityRequest): Promise<FoodQualityResponse> {
  try {
    const response = await apiRequest<Record<string, unknown>>("/api/nutrition/food-quality", {
      method: "POST",
      body: {
        dishes: req.items.map((item) => item.name),
        notes: req.mealType ? `Meal type: ${req.mealType}` : undefined,
      },
    });
    const message =
      (typeof response.feedback === "string" && response.feedback) ||
      (typeof response.message === "string" && response.message) ||
      localFoodQuality(req).feedback;
    return { feedback: message, aiObservation: true };
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 429) {
      const degraded = localFoodQuality(req);
      return {
        ...degraded,
        degraded: true,
        message:
          err.body && typeof err.body === "object" && typeof err.body.message === "string"
            ? err.body.message
            : err.message,
      };
    }
    if (err instanceof ApiClientError && err.endpointUnavailable) return localFoodQuality(req);
    throw err;
  }
}
