/**
 * Spring Boot API base URL — never call FastAI directly from the client.
 */
export function getApiBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (url) return url.replace(/\/$/, '');
  return 'http://localhost:8080';
}

export const UAT_MOCK_RECEIPT = 'UAT_MOCK_RECEIPT';

/** Low-confidence threshold for on-device OCR before NIM fallback via backend. */
export const OCR_CONFIDENCE_THRESHOLD = 0.65;
