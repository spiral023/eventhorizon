import type { ApiResult } from "@/types/api";
import type { ApiAvatarUploadInfo, ApiCreateEvent, ApiEvent, ApiEventUpdate } from "@/types/apiDomain";
import type {
  BudgetType,
  DateResponseType,
  Event,
  EventPhase,
  EventTimeWindow,
  VoteType,
} from "@/types/domain";
import type { CreateEventInput } from "@/schemas";
import type { AvatarUploadInfo } from "./types";
import { getMockAdapter, request, USE_MOCKS } from "./core";
import { mapEventFromApi } from "./mappers";

export async function getEventsByAccessCode(accessCode: string): Promise<ApiResult<Event[]>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getEventsByAccessCode(accessCode);
  }
  const result = await request<ApiEvent[]>(`/rooms/${accessCode}/events`);
  if (result.data) {
    return { data: result.data.map(mapEventFromApi) };
  }
  return { data: undefined, error: result.error };
}

export async function getEventByCode(eventCode: string): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getEventByCode(eventCode);
  }
  const result = await request<ApiEvent>(`/events/${eventCode}`);
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function deleteEvent(eventCode: string): Promise<ApiResult<void>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.deleteEvent(eventCode);
  }
  return request<void>(`/events/${eventCode}`, {
    method: "DELETE",
  });
}

export async function createEvent(
  accessCode: string,
  input: CreateEventInput & { timeWindow: EventTimeWindow }
): Promise<ApiResult<Event>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.createEvent(accessCode, input);
  }

  const apiPayload: ApiCreateEvent = {
    name: input.name,
    description: input.description,
    time_window: input.timeWindow,
    voting_deadline: input.votingDeadline,
    budget_type: input.budgetType,
    budget_amount: input.budgetAmount,
    participant_count_estimate: input.participantCountEstimate,
    location_region: input.locationRegion,
    proposed_activity_ids: input.proposedActivityIds,
  };

  console.log(`Making API call to create event for room ${accessCode}`, apiPayload);
  const result = await request<ApiEvent>(`/rooms/${accessCode}/events`, {
    method: "POST",
    body: JSON.stringify(apiPayload),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
}

export async function updateEvent(
  eventCode: string,
  updates: {
    name?: string;
    description?: string;
    budgetType?: BudgetType;
    budgetAmount?: number;
    avatarUrl?: string;
    inviteSentAt?: string;
    lastReminderAt?: string;
    unreadMessageCount?: number;
  }
): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.updateEvent(eventCode, updates);
  }

  const payload: ApiEventUpdate = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.budgetType !== undefined) payload.budget_type = updates.budgetType;
  if (updates.budgetAmount !== undefined) payload.budget_amount = updates.budgetAmount;
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
  if (updates.inviteSentAt !== undefined) payload.invite_sent_at = updates.inviteSentAt;
  if (updates.lastReminderAt !== undefined) payload.last_reminder_at = updates.lastReminderAt;
  if (updates.unreadMessageCount !== undefined) payload.unread_message_count = updates.unreadMessageCount;

  const result = await request<ApiEvent>(`/events/${eventCode}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function getEventAvatarUploadUrl(
  eventCode: string,
  contentType: string,
  fileSize: number
): Promise<ApiResult<AvatarUploadInfo>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getEventAvatarUploadUrl(eventCode, contentType, fileSize);
  }
  const result = await request<ApiAvatarUploadInfo>(`/events/${eventCode}/avatar/upload-url`, {
    method: "POST",
    body: JSON.stringify({ content_type: contentType, file_size: fileSize }),
  });
  if (result.data) {
    return {
      data: {
        uploadUrl: result.data.upload_url ?? result.data.uploadUrl,
        publicUrl: result.data.public_url ?? result.data.publicUrl,
        uploadKey: result.data.upload_key ?? result.data.uploadKey,
      },
    };
  }
  return { data: null, error: result.error };
}

export async function processEventAvatar(
  eventCode: string,
  uploadKey: string,
  outputFormat: "webp" | "avif" | "jpeg" | "jpg" | "png" | undefined = "webp"
): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.processEventAvatar(eventCode, uploadKey, outputFormat);
  }

  const result = await request<ApiEvent>(`/events/${eventCode}/avatar/process`, {
    method: "POST",
    body: JSON.stringify({ upload_key: uploadKey, output_format: outputFormat }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function uploadEventAvatar(eventCode: string, file: File): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.uploadEventAvatar(eventCode, file);
  }

  const presign = await getEventAvatarUploadUrl(eventCode, file.type, file.size);
  if (presign.error || !presign.data) {
    return { data: null, error: presign.error };
  }

  const putRes = await fetch(presign.data.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!putRes.ok) {
    return { data: null, error: { code: String(putRes.status), message: "Upload fehlgeschlagen" } };
  }

  if (!presign.data.uploadKey) {
    return await updateEvent(eventCode, { avatarUrl: presign.data.publicUrl });
  }

  return await processEventAvatar(eventCode, presign.data.uploadKey, "webp");
}

export async function updateEventPhase(eventCode: string, newPhase: EventPhase): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.updateEventPhase(eventCode, newPhase);
  }
  const result = await request<ApiEvent>(`/events/${eventCode}/phase`, {
    method: "PATCH",
    body: JSON.stringify({ phase: newPhase }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
}

export async function removeProposedActivity(eventCode: string, activityId: string): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.removeProposedActivity(eventCode, activityId);
  }

  const result = await request<ApiEvent>(`/events/${eventCode}/proposed-activities/${activityId}`, {
    method: "DELETE",
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function excludeActivity(eventCode: string, activityId: string): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.excludeActivity(eventCode, activityId);
  }

  const result = await request<ApiEvent>(`/events/${eventCode}/activities/${activityId}/exclude`, {
    method: "PATCH",
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function includeActivity(eventCode: string, activityId: string): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.includeActivity(eventCode, activityId);
  }

  const result = await request<ApiEvent>(`/events/${eventCode}/activities/${activityId}/include`, {
    method: "PATCH",
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function voteOnActivity(
  eventCode: string,
  activityId: string,
  vote: VoteType
): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.voteOnActivity(eventCode, activityId, vote);
  }
  const result = await request<ApiEvent>(`/events/${eventCode}/votes`, {
    method: "POST",
    body: JSON.stringify({ activity_id: activityId, vote }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
}

export async function addDateOption(
  eventCode: string,
  date: string,
  startTime?: string,
  endTime?: string
): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.addDateOption(eventCode, date, startTime, endTime);
  }
  const result = await request<ApiEvent>(`/events/${eventCode}/date-options`, {
    method: "POST",
    body: JSON.stringify({ date, start_time: startTime, end_time: endTime }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
}

export async function deleteDateOption(eventCode: string, dateOptionId: string): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.deleteDateOption(eventCode, dateOptionId);
  }
  const result = await request<ApiEvent>(`/events/${eventCode}/date-options/${dateOptionId}`, {
    method: "DELETE",
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
}

export async function respondToDateOption(
  eventCode: string,
  dateOptionId: string,
  response: DateResponseType,
  isPriority = false,
  contribution?: number
): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.respondToDateOption(eventCode, dateOptionId, response, isPriority, contribution);
  }
  const result = await request<ApiEvent>(`/events/${eventCode}/date-options/${dateOptionId}/response`, {
    method: "POST",
    body: JSON.stringify({ response, is_priority: isPriority, contribution }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
}

export async function selectWinningActivity(eventCode: string, activityId: string): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.selectWinningActivity(eventCode, activityId);
  }
  const result = await request<ApiEvent>(`/events/${eventCode}/select-activity`, {
    method: "POST",
    body: JSON.stringify({ activity_id: activityId }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
}

export async function finalizeDateOption(eventCode: string, dateOptionId: string): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.finalizeDateOption(eventCode, dateOptionId);
  }
  const result = await request<ApiEvent>(`/events/${eventCode}/finalize-date`, {
    method: "POST",
    body: JSON.stringify({ date_option_id: dateOptionId }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
}
