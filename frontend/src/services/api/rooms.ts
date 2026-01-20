import type { ApiResult } from "@/types/api";
import type { ApiAvatarUploadInfo, ApiRoom, ApiRoomMember, ApiRoomUpdate } from "@/types/apiDomain";
import type { Room, RoomRole } from "@/types/domain";
import type { AvatarUploadInfo, RoomMember } from "./types";
import { getMockAdapter, request, USE_MOCKS } from "./core";
import { mapRoomFromApi } from "./mappers";

export async function getRooms(): Promise<ApiResult<Room[]>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getRooms();
  }
  const result = await request<ApiRoom[]>("/rooms");
  if (result.data) {
    return { data: result.data.map(mapRoomFromApi) };
  }
  return { data: undefined, error: result.error };
}

export async function getRoomByAccessCode(accessCode: string): Promise<ApiResult<Room | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getRoomByAccessCode(accessCode);
  }
  const result = await request<ApiRoom>(`/rooms/${accessCode}`);
  if (result.data) {
    return { data: mapRoomFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function updateRoom(
  accessCode: string,
  updates: { name?: string; description?: string; avatarUrl?: string }
): Promise<ApiResult<Room | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.updateRoom(accessCode, updates);
  }

  const apiPayload: ApiRoomUpdate = {};
  if (updates.name !== undefined) apiPayload.name = updates.name;
  if (updates.description !== undefined) apiPayload.description = updates.description;
  if (updates.avatarUrl !== undefined) apiPayload.avatar_url = updates.avatarUrl;

  const result = await request<ApiRoom>(`/rooms/${accessCode}`, {
    method: "PATCH",
    body: JSON.stringify(apiPayload),
  });
  if (result.data) {
    return { data: mapRoomFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function getRoomAvatarUploadUrl(
  accessCode: string,
  contentType: string,
  fileSize: number
): Promise<ApiResult<AvatarUploadInfo>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getRoomAvatarUploadUrl(accessCode, contentType, fileSize);
  }

  const result = await request<ApiAvatarUploadInfo>(`/rooms/${accessCode}/avatar/upload-url`, {
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

export async function processRoomAvatar(
  accessCode: string,
  uploadKey: string,
  outputFormat: "webp" | "avif" | "jpeg" | "jpg" | "png" | undefined = "webp"
): Promise<ApiResult<Room | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.processRoomAvatar(accessCode, uploadKey, outputFormat);
  }

  const result = await request<ApiRoom>(`/rooms/${accessCode}/avatar/process`, {
    method: "POST",
    body: JSON.stringify({ upload_key: uploadKey, output_format: outputFormat }),
  });
  if (result.data) {
    return { data: mapRoomFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function uploadRoomAvatar(accessCode: string, file: File): Promise<ApiResult<Room | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.uploadRoomAvatar(accessCode, file);
  }

  const presign = await getRoomAvatarUploadUrl(accessCode, file.type, file.size);
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
    return { data: null, error: { code: "UPLOAD_KEY_MISSING", message: "Upload key fehlt" } };
  }

  return await processRoomAvatar(accessCode, presign.data.uploadKey, "webp");
}

export async function createRoom(input: { name: string; description?: string }): Promise<ApiResult<Room>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.createRoom(input);
  }
  const result = await request<ApiRoom>("/rooms", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (result.data) {
    return { data: mapRoomFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
}

export async function deleteRoom(accessCode: string): Promise<ApiResult<void>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.deleteRoom(accessCode);
  }
  return request<void>(`/rooms/${accessCode}`, {
    method: "DELETE",
  });
}

export async function joinRoom(inviteCode: string): Promise<ApiResult<Room>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.joinRoom(inviteCode);
  }
  const result = await request<ApiRoom>("/rooms/join", {
    method: "POST",
    body: JSON.stringify({ invite_code: inviteCode }),
  });
  if (result.data) {
    return { data: mapRoomFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
}

export async function leaveRoom(accessCode: string): Promise<ApiResult<void>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.leaveRoom(accessCode);
  }

  return request<void>(`/rooms/${accessCode}/leave`, {
    method: "POST",
  });
}

export async function getRoomMembers(accessCode: string): Promise<ApiResult<RoomMember[]>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getRoomMembers(accessCode);
  }
  const result = await request<ApiRoomMember[]>(`/rooms/${accessCode}/members`);
  if (result.data) {
    const members = result.data.map((m: ApiRoomMember, index) => ({
      id: m.user_id ?? m.id ?? `member-${index}`,
      name: m.user_name || m.name || "",
      email: "",
      username: m.user_name || m.name || "",
      avatarUrl: m.avatar_url,
      role: m.role as RoomRole,
      joinedAt: m.joined_at,
    }));
    return { data: members };
  }
  return { data: undefined, error: result.error };
}
