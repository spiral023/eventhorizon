import type { ApiResult } from "@/types/api";
import type { ApiActivity } from "@/types/apiDomain";
import type { Activity } from "@/types/domain";
import { getMockAdapter, request, USE_MOCKS } from "./core";
import { mapActivityFromApi } from "./mappers";

export async function getActivities(roomId?: string): Promise<ApiResult<Activity[]>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getActivities(roomId);
  }
  let url = "/activities";
  if (roomId) {
    url += `?room_id=${roomId}`;
  }
  const result = await request<ApiActivity[]>(url);
  if (result.data) {
    return { data: result.data.map(mapActivityFromApi) };
  }
  return { data: undefined, error: result.error };
}

export async function getActivityById(id: string): Promise<ApiResult<Activity | null>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getActivityById(id);
  }
  const result = await request<ApiActivity>(`/activities/${id}`);
  if (result.data) {
    return { data: mapActivityFromApi(result.data) };
  }
  return { data: null, error: result.error };
}
