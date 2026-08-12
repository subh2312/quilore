import { apiRequest, ApiClientError } from "./client";
import type { FoodAlias } from "./types";

export async function listFoodAliases(): Promise<FoodAlias[]> {
  try {
    const rows = await apiRequest<Array<Record<string, unknown>>>("/api/admin/food-aliases");
    return rows.map((r) => ({
      id: String(r.id),
      alias: String(r.alias ?? r.rawAlias ?? ""),
      foodCode: r.foodCode != null ? String(r.foodCode) : undefined,
      status: r.status != null ? String(r.status) : undefined,
    }));
  } catch (err) {
    if (err instanceof ApiClientError && err.endpointUnavailable) {
      return [{ id: "local-1", alias: "dalma", foodCode: "IFCT-DALMA", status: "pending" }];
    }
    throw err;
  }
}

export async function submitFoodAlias(alias: string, foodCode: string) {
  return apiRequest("/api/admin/food-aliases", { method: "POST", body: { alias, foodCode } });
}
