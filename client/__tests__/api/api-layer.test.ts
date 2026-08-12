/**
 * API layer contract tests — pure logic, no network.
 */

import { getApiBaseUrl, UAT_MOCK_RECEIPT, OCR_CONFIDENCE_THRESHOLD } from "../../lib/api/config";
import {
  clearStoredSession,
  getLastAuthActivityMs,
  getStoredAccessToken,
  persistSession,
} from "../../lib/api/authStorage";
import { isSupportOrAdmin } from "../../lib/api/auth";
import { sendCoachChat } from "../../lib/api/coach";
import { fetchFoodQuality } from "../../lib/api/nutrition";
import { fetchSessionSummary, mapWorkoutOcr } from "../../lib/api/workout";

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

describe("Auth register and refresh", () => {
  const globalFetch = global.fetch;

  afterEach(async () => {
    global.fetch = globalFetch;
    await clearStoredSession();
  });

  it("registers via Spring Boot and persists session", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: { id: "22222222-2222-2222-2222-222222222222", email: "a@b.com", displayName: "Alex", role: "USER" },
        accessToken: "access-new",
        refreshToken: "refresh-new",
        expiresAt: "2026-08-13T00:00:00Z",
      }),
    });

    const { register } = await import("../../lib/api/auth");
    const session = await register("a@b.com", "password123", "Alex");

    expect(session.user.displayName).toBe("Alex");
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/auth/register",
      expect.objectContaining({ method: "POST" }),
    );
    expect(await getStoredAccessToken()).toBe("access-new");
    expect(await getLastAuthActivityMs()).not.toBeNull();
  });

  it("refreshes session and clears tokens on failure", async () => {
    await persistSession({
      accessToken: "old-access",
      refreshToken: "old-refresh",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      headers: { get: () => "application/json" },
      json: async () => ({ message: "Invalid refresh token" }),
    });

    const { refreshSession } = await import("../../lib/api/auth");
    const session = await refreshSession();

    expect(session).toBeNull();
    expect(await getStoredAccessToken()).toBeNull();
  });

  it("clears stored session on logout even when refresh rotated tokens during logout", async () => {
    await persistSession({
      accessToken: "old-access",
      refreshToken: "old-refresh",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (url.endsWith("/api/auth/logout")) {
        await persistSession({
          accessToken: "rotated-access",
          refreshToken: "rotated-refresh",
          userId: "11111111-1111-1111-1111-111111111111",
        });
        return { ok: true, status: 200, json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          user: { id: "11111111-1111-1111-1111-111111111111", email: "a@b.com", displayName: "Alex", role: "USER" },
          accessToken: "rotated-access",
          refreshToken: "rotated-refresh",
          expiresAt: "2026-08-13T00:00:00Z",
        }),
      };
    });

    const { logout } = await import("../../lib/api/auth");
    await logout("old-refresh");

    expect(await getStoredAccessToken()).toBeNull();
  });

  it("preserves a new login session when logout finishes after re-authentication", async () => {
    await persistSession({
      accessToken: "old-access",
      refreshToken: "old-refresh",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (url.endsWith("/api/auth/logout")) {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true, status: 200, json: async () => ({}) }), 20);
        });
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          user: { id: "22222222-2222-2222-2222-222222222222", email: "b@c.com", displayName: "Sam", role: "USER" },
          accessToken: "new-access",
          refreshToken: "new-refresh",
          expiresAt: "2026-08-13T00:00:00Z",
        }),
      };
    });

    const { logout, login } = await import("../../lib/api/auth");
    const logoutPromise = logout("old-refresh");
    await login("b@c.com", "password123");
    await logoutPromise;

    expect(await getStoredAccessToken()).toBe("new-access");
  });
});

describe("Coach chat fallback", () => {
  const globalFetch = global.fetch;

  afterEach(async () => {
    global.fetch = globalFetch;
    await clearStoredSession();
  });

  it("returns local draft when backend endpoint unavailable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline"));
    const res = await sendCoachChat({ message: "add a superset for chest" });
    expect(res.aiObservation).toBe(true);
    expect(res.reply.toLowerCase()).toContain("superset");
  });

  it("calls Spring Boot coach endpoint with JWT auth", async () => {
    await persistSession({
      accessToken: "jwt-token",
      refreshToken: "refresh-token",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ envelope: { message: "Draft suggestion", provider: "spring-gateway" } }),
    });

    const res = await sendCoachChat({ message: "program tweak" });

    expect(res.provider).toBe("spring-gateway");
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/coach/chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer jwt-token" }),
      }),
    );
  });

  it("degrades quota-limited coach chat into editable fallback", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      headers: { get: () => "application/json" },
      json: async () => ({ message: "AI coaching quota exceeded", degraded: true, editable: true }),
    });

    const res = await sendCoachChat({ message: "add a superset for chest" });

    expect(res.degraded).toBe(true);
    expect(res.message).toContain("quota exceeded");
    expect(res.reply.toLowerCase()).toContain("superset");
  });
});

describe("Nutrition and workout Spring Boot endpoints", () => {
  const globalFetch = global.fetch;

  afterEach(async () => {
    global.fetch = globalFetch;
    await clearStoredSession();
  });

  it("posts meal quality requests to Spring Boot food-quality", async () => {
    await persistSession({
      accessToken: "jwt-token",
      refreshToken: "refresh-token",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ feedback: "Editable food-quality draft" }),
    });

    const res = await fetchFoodQuality({ items: [{ name: "Dalma", grams: 180 }], mealType: "lunch" });

    expect(res.feedback).toContain("Editable");
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/nutrition/food-quality",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer jwt-token" }),
      }),
    );
  });

  it("degrades quota-limited OCR mapping with a local parse", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      headers: { get: () => "application/json" },
      json: async () => ({ message: "AI scan quota exceeded", degraded: true, editable: true }),
    });

    const res = await mapWorkoutOcr({ text: "Bench Press 3x8", source: "on_device_ocr" });

    expect(res.degraded).toBe(true);
    expect(res.message).toContain("quota exceeded");
    expect(res.exercises).toHaveLength(1);
  });

  it("keeps session summaries on the Spring Boot session-summary route", async () => {
    await persistSession({
      accessToken: "jwt-token",
      refreshToken: "refresh-token",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        durationMinutes: 42,
        totalVolumeKg: 1200,
        exerciseCount: 2,
        personalRecords: [],
      }),
    });

    await fetchSessionSummary({
      sessionId: "w_1",
      startedAt: "2026-08-12T10:00:00.000Z",
      completedAt: "2026-08-12T10:42:00.000Z",
      exercises: [{ name: "Squat", sets: [{ reps: 5, weightKg: 100 }] }],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/workout/11111111-1111-1111-1111-111111111111/session-summary",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer jwt-token" }),
      }),
    );
  });
});
