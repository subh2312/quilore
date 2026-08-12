/**
 * API layer contract tests — pure logic, no network.
 */

import { getApiBaseUrl, UAT_MOCK_RECEIPT, OCR_CONFIDENCE_THRESHOLD } from "../../lib/api/config";
import { isSupportOrAdmin } from "../../lib/api/auth";
import { sendCoachChat } from "../../lib/api/coach";

describe("API config", () => {
  const orig = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    process.env.EXPO_PUBLIC_API_URL = orig;
  });

  it("defaults to localhost Spring Boot", () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(getApiBaseUrl()).toBe("http://localhost:8080");
  });

  it("strips trailing slash from EXPO_PUBLIC_API_URL", () => {
    process.env.EXPO_PUBLIC_API_URL = "http://10.0.0.5:8080/";
    expect(getApiBaseUrl()).toBe("http://10.0.0.5:8080");
  });

  it("exposes UAT mock receipt constant", () => {
    expect(UAT_MOCK_RECEIPT).toBe("UAT_MOCK_RECEIPT");
  });

  it("uses OCR confidence threshold for ML Kit fallback", () => {
    expect(OCR_CONFIDENCE_THRESHOLD).toBeGreaterThan(0);
    expect(OCR_CONFIDENCE_THRESHOLD).toBeLessThan(1);
  });
});

describe("Auth role gates", () => {
  it("allows SUPPORT and ADMIN for admin console", () => {
    expect(isSupportOrAdmin("SUPPORT")).toBe(true);
    expect(isSupportOrAdmin("ADMIN")).toBe(true);
    expect(isSupportOrAdmin("USER")).toBe(false);
  });
});

describe("Coach chat fallback", () => {
  it("returns local draft when backend endpoint unavailable", async () => {
    const globalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error("offline"));
    const res = await sendCoachChat({ message: "add a superset for chest" });
    expect(res.aiObservation).toBe(true);
    expect(res.reply.toLowerCase()).toContain("superset");
    global.fetch = globalFetch;
  });
});
