import type { ApiResult } from "@/types/api";
import type { ApiAvatarUploadInfo, ApiEvent, ApiUser, ApiUserStats, ApiUserUpdate, ApiBirthdayPageResponse } from "@/types/apiDomain";
import type { Event, User, UserStats, BirthdayPageResponse } from "@/types/domain";
import type { AvatarUploadInfo } from "./types";
import { getMockAdapter, request, USE_MOCKS } from "./core";
import { mapEventFromApi, mapUserFromApi, mapBirthdayPageResponseFromApi } from "./mappers";

export async function getCurrentUser(): Promise<ApiResult<User | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getCurrentUser();
  }
  const result = await request<ApiUser>("/users/me");
  if (result.data) {
    return { data: mapUserFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function updateUser(updates: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyId?: number | null;
  department?: string;
  position?: string;
  location?: string;
  birthday?: string;
  isBirthdayPrivate?: boolean;
  bio?: string;
  hobbies?: string[];
  activityPreferences?: unknown;
  dietaryRestrictions?: string[];
  allergies?: string[];
  avatarUrl?: string;
}): Promise<ApiResult<User | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.updateUser(updates);
  }

  const apiUpdates: ApiUserUpdate = {};
  if (updates.firstName !== undefined) apiUpdates.first_name = updates.firstName;
  if (updates.lastName !== undefined) apiUpdates.last_name = updates.lastName;
  if (updates.phone !== undefined) apiUpdates.phone = updates.phone;
  if (updates.companyId !== undefined) apiUpdates.company_id = updates.companyId;
  if (updates.department !== undefined) apiUpdates.department = updates.department;
  if (updates.position !== undefined) apiUpdates.position = updates.position;
  if (updates.location !== undefined) apiUpdates.location = updates.location;
  if (updates.birthday !== undefined) apiUpdates.birthday = updates.birthday;
  if (updates.isBirthdayPrivate !== undefined) apiUpdates.is_birthday_private = updates.isBirthdayPrivate;
  if (updates.bio !== undefined) apiUpdates.bio = updates.bio;
  if (updates.hobbies !== undefined) apiUpdates.hobbies = updates.hobbies;
  if (updates.activityPreferences !== undefined) apiUpdates.activity_preferences = updates.activityPreferences;
  if (updates.dietaryRestrictions !== undefined) apiUpdates.dietary_restrictions = updates.dietaryRestrictions;
  if (updates.allergies !== undefined) apiUpdates.allergies = updates.allergies;
  if (updates.avatarUrl !== undefined) apiUpdates.avatar_url = updates.avatarUrl;

  const result = await request<ApiUser>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(apiUpdates),
  });

  if (result.data) {
    return { data: mapUserFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function getAvatarUploadUrl(
  contentType: string,
  fileSize: number
): Promise<ApiResult<AvatarUploadInfo>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getAvatarUploadUrl(contentType, fileSize);
  }

  const result = await request<ApiAvatarUploadInfo>("/users/me/avatar/upload-url", {
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

export async function processAvatarUpload(
  uploadKey: string,
  outputFormat: "webp" | "avif" | "jpeg" | "jpg" | "png" | undefined = "webp"
): Promise<ApiResult<User | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.processAvatarUpload(uploadKey, outputFormat);
  }

  const result = await request<ApiUser>("/users/me/avatar/process", {
    method: "POST",
    body: JSON.stringify({ upload_key: uploadKey, output_format: outputFormat }),
  });

  if (result.data) {
    return { data: mapUserFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function uploadAvatar(file: File): Promise<ApiResult<User | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.uploadAvatar(file);
  }

  const presign = await getAvatarUploadUrl(file.type, file.size);
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
    const msg = `Upload fehlgeschlagen (HTTP ${putRes.status})`;
    return { data: null, error: { code: String(putRes.status), message: msg } };
  }

  if (!presign.data.uploadKey) {
    return await updateUser({ avatarUrl: presign.data.publicUrl });
  }

  return await processAvatarUpload(presign.data.uploadKey, "webp");
}

export async function getUserStats(): Promise<ApiResult<UserStats>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getUserStats();
  }
  const result = await request<ApiUserStats>("/users/me/stats");
  if (result.data) {
    return {
      data: {
        upcomingEventsCount: result.data.upcoming_events_count,
        openVotesCount: result.data.open_votes_count,
      },
    };
  }
  return { data: undefined, error: result.error };
}

export async function getUserEvents(): Promise<ApiResult<Event[]>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getUserEvents();
  }
  const result = await request<ApiEvent[]>("/users/me/events");
  if (result.data) {
    return { data: result.data.map(mapEventFromApi) };
  }
  return { data: undefined, error: result.error };
}

export async function getBirthdays(): Promise<ApiResult<BirthdayPageResponse>> {
  if (USE_MOCKS) {
    // TODO: Add mock if needed
    return { data: undefined, error: { code: '501', message: 'Not implemented in mock' } };
  }
  const result = await request<ApiBirthdayPageResponse>('/users/birthdays');
  if (result.data) {
    return { data: mapBirthdayPageResponseFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
}

