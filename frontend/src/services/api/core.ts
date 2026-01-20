import type { ApiError, ApiResult } from "@/types/api";
import { fetchJwtToken } from "@/lib/authClient";

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";
export const API_BASE = "/api/v1";

type CachedBearer = { token: string; expiresAt: number };
let cachedBearer: CachedBearer | null = null;

const decodeJwtExpiry = (token: string): number | null => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload?.exp) {
      return Number(payload.exp) * 1000;
    }
  } catch {
    /* ignore parse errors */
  }
  return null;
};

export const setCachedToken = (token: string | null) => {
  if (!token) {
    cachedBearer = null;
    return;
  }
  const expiry = decodeJwtExpiry(token);
  const fallbackExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
  cachedBearer = {
    token,
    expiresAt: expiry ? expiry - 5000 : fallbackExpiry,
  };
};

export const getAuthHeader = async (): Promise<HeadersInit> => {
  if (USE_MOCKS) {
    return {};
  }
  if (cachedBearer && cachedBearer.expiresAt > Date.now()) {
    return { Authorization: `Bearer ${cachedBearer.token}` };
  }
  const token = await fetchJwtToken();
  if (token) {
    setCachedToken(token);
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

export async function request<T>(endpoint: string, options?: RequestInit): Promise<ApiResult<T>> {
  const authHeader = await getAuthHeader();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options?.headers || {}),
    ...authHeader,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: headers,
      ...options,
    });

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const rawText = await response.text();
      data = rawText || null;
      if (data === "null") data = null;
    }

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;
      if (data && typeof data === "object" && "detail" in data) {
        errorMessage = (data as ApiError).detail as string;
      } else if (typeof data === "string" && data.length > 0) {
        errorMessage = data;
      }

      return {
        data: undefined,
        error: { code: String(response.status), message: errorMessage },
      };
    }

    if (data === "null") data = null;
    return { data: data as T };
  } catch (e) {
    return {
      data: undefined,
      error: { code: "NETWORK_ERROR", message: e instanceof Error ? e.message : "Netzwerkfehler" },
    };
  }
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type MockAdapter = typeof import("./mockAdapter");
let mockAdapter: MockAdapter | null = null;

export const getMockAdapter = async (): Promise<MockAdapter> => {
  if (!mockAdapter) {
    mockAdapter = await import("./mockAdapter");
  }
  return mockAdapter;
};
