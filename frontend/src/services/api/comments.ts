import type { ApiResult } from "@/types/api";
import type { ApiActivityComment, ApiEventComment } from "@/types/apiDomain";
import type { ActivityComment, EventComment, EventPhase } from "@/types/domain";
import { getMockAdapter, request, USE_MOCKS } from "./core";
import { mapActivityCommentFromApi, mapCommentFromApi } from "./mappers";

export async function getEventComments(
  eventCode: string,
  phase?: EventPhase,
  skip = 0,
  limit = 50
): Promise<ApiResult<EventComment[]>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getEventComments(eventCode, phase, skip, limit);
  }

  let url = `/events/${eventCode}/comments?skip=${skip}&limit=${limit}`;
  if (phase) url += `&phase=${phase}`;

  const result = await request<ApiEventComment[]>(url);
  if (result.data) {
    return { data: result.data.map(mapCommentFromApi) };
  }
  return { data: undefined, error: result.error };
}

export async function createEventComment(
  eventCode: string,
  content: string,
  phase: EventPhase
): Promise<ApiResult<EventComment>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.createEventComment(eventCode, content, phase);
  }

  const result = await request<ApiEventComment>(`/events/${eventCode}/comments`, {
    method: "POST",
    body: JSON.stringify({ content, phase }),
  });

  if (result.data) {
    return { data: mapCommentFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
}

export async function deleteEventComment(eventCode: string, commentId: string): Promise<ApiResult<void>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.deleteEventComment(eventCode, commentId);
  }

  const result = await request<void>(`/events/${eventCode}/comments/${commentId}`, {
    method: "DELETE",
  });
  if (result.error) {
    return { data: undefined, error: result.error };
  }
  return { data: undefined };
}

export async function getActivityComments(
  activityId: string,
  skip = 0,
  limit = 50
): Promise<ApiResult<ActivityComment[]>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getActivityComments(activityId, skip, limit);
  }

  const result = await request<ApiActivityComment[]>(`/activities/${activityId}/comments?skip=${skip}&limit=${limit}`);
  if (result.data) {
    return { data: result.data.map(mapActivityCommentFromApi) };
  }
  return { data: undefined, error: result.error };
}

export async function createActivityComment(activityId: string, content: string): Promise<ApiResult<ActivityComment>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.createActivityComment(activityId, content);
  }

  const result = await request<ApiActivityComment>(`/activities/${activityId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });

  if (result.data) {
    return { data: mapActivityCommentFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
}

export async function deleteActivityComment(activityId: string, commentId: string): Promise<ApiResult<void>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.deleteActivityComment(activityId, commentId);
  }

  const result = await request<void>(`/activities/${activityId}/comments/${commentId}`, {
    method: "DELETE",
  });
  if (result.error) {
    return { data: undefined, error: result.error };
  }
  return { data: undefined };
}
