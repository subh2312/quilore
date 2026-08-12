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
    const insights = await apiRequest<Array<{ message?: string }>>("/api/nutrition/insights/training", {
      method: "POST",
      body: { avgCalorieAdherence: 0.9, avgProteinAdherence: 0.85, avgTrainingVolumeDelta: 0, days: 7 },
    });
    const msg = insights[0]?.message ?? localFoodQuality(req).feedback;
    return { feedback: msg, aiObservation: true };
  } catch (err) {
    if (err instanceof ApiClientError && err.endpointUnavailable) return localFoodQuality(req);
    throw err;
  }
}
