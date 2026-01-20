import type { ApiError, ApiResult } from "@/types/api";
import type { ApiSentCount } from "@/types/apiDomain";
import { trackAiAnalysisDuration } from "@/lib/metrics";
import type { AiRecommendation, TeamPreferenceSummary } from "./types";
import { API_BASE, delay, getAuthHeader, getMockAdapter, request, USE_MOCKS } from "./core";

export async function getTeamRecommendations(roomId: string): Promise<ApiResult<TeamPreferenceSummary>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getTeamRecommendations(roomId);
  }

  const authHeader = await getAuthHeader();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...authHeader,
  };

  const start = typeof performance !== "undefined" ? performance.now() : Date.now();

  try {
    const response = await fetch(`${API_BASE}/ai/rooms/${roomId}/recommendations`, {
      headers,
    });
    const cacheHeader = response.headers.get("x-ai-cache");

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

    if (cacheHeader === "miss") {
      const end = typeof performance !== "undefined" ? performance.now() : Date.now();
      const durationMs = Math.max(0, end - start);
      trackAiAnalysisDuration(durationMs, { cache: "miss" });
    }

    return { data: data as TeamPreferenceSummary };
  } catch (e) {
    return {
      data: undefined,
      error: { code: "NETWORK_ERROR", message: e instanceof Error ? e.message : "Netzwerkfehler" },
    };
  }
}

export async function getActivitySuggestionsForEvent(eventCode: string): Promise<ApiResult<AiRecommendation[]>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getActivitySuggestionsForEvent(eventCode);
  }
  await delay(500);
  return { data: [] };
}

export async function sendEventInvites(eventCode: string): Promise<ApiResult<{ sent: number }>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.sendEventInvites(eventCode);
  }

  const result = await request<ApiSentCount>(`/ai/events/${eventCode}/invites`, {
    method: "POST",
  });
  if (result.data) {
    return { data: { sent: result.data.sent ?? result.data.count ?? 0 } };
  }
  return { data: undefined, error: result.error };
}

export async function sendVotingReminder(eventCode: string, userId?: string): Promise<ApiResult<{ sent: number }>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.sendVotingReminder(eventCode, userId);
  }

  const body = userId ? { user_id: userId } : undefined;
  const result = await request<ApiSentCount>(`/ai/events/${eventCode}/voting-reminders`, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (result.data) {
    return { data: { sent: result.data.sent ?? result.data.count ?? 0 } };
  }
  return { data: undefined, error: result.error };
}
