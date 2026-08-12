import { getApiBaseUrl } from './config';
import { getAccessToken } from './authStorage';
import type { ApiError } from './types';

export class ApiClientError extends Error {
  status: number;
  endpointUnavailable: boolean;

  constructor(payload: ApiError) {
    super(payload.message);
    this.name = 'ApiClientError';
    this.status = payload.status;
    this.endpointUnavailable = payload.endpointUnavailable ?? false;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, headers = {} } = options;
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  const reqHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  if (body !== undefined) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = await getAccessToken();
    if (token) reqHeaders.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new ApiClientError({
      status: 0,
      message: err instanceof Error ? err.message : 'Network request failed',
      endpointUnavailable: true,
    });
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message: unknown }).message)
        : typeof parsed === 'string'
          ? parsed
          : `HTTP ${response.status}`;
    throw new ApiClientError({
      status: response.status,
      message,
      endpointUnavailable: response.status === 404 || response.status === 503,
    });
  }

  return parsed as T;
}
