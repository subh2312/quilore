export const DEFAULT_API_BASE = "http://localhost:8080";

export const UAT_MOCK_RECEIPT = "UAT_MOCK_RECEIPT";

export const OCR_CONFIDENCE_THRESHOLD = 0.55;

export function getApiBaseUrl(): string {
  const envValue = process.env.EXPO_PUBLIC_API_URL;
  const raw =
    envValue && envValue !== "undefined" && envValue !== "null" ? envValue : DEFAULT_API_BASE;
  return raw.replace(/\/$/, "");
}

export function getSentryDsn(): string | undefined {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  return dsn && dsn.length > 0 ? dsn : undefined;
}
