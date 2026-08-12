import { getApiBaseUrl } from "./config";
import { getStoredAccessToken } from "./authStorage";

export type ApiClientErrorShape = { status: number; message: string; endpointUnavailable?: boolean };

export class ApiClientError extends Error {
  status: number;
  endpointUnavailable: boolean;
  constructor(shape: ApiClientErrorShape) {
    super(shape.message);
    this.name = "ApiClientError";
    this.status = shape.status;
    this.endpointUnavailable = Boolean(shape.endpointUnavailable);
  }
}

export type ApiRequestInit = { method?: string; body?: unknown; auth?: boolean };

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const base = getApiBaseUrl();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.auth !== false) {
    const token = await getStoredAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch (err) {
    throw new ApiClientError({ status: 0, message: err instanceof Error ? err.message : "Network error", endpointUnavailable: true });
  }
  if ([404, 501, 502, 503].includes(res.status)) {
    throw new ApiClientError({ status: res.status, message: `Endpoint unavailable: ${path}`, endpointUnavailable: true });
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiClientError({ status: res.status, message: text || res.statusText, endpointUnavailable: false });
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
