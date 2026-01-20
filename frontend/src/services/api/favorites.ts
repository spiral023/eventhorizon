import type { ApiResult } from "@/types/api";
import { trackFavoriteToggle } from "@/lib/metrics";
import { getMockAdapter, request, USE_MOCKS } from "./core";

export async function getFavoriteActivityIds(): Promise<ApiResult<string[]>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.getFavoriteActivityIds();
  }
  const res = await request<string[]>("/activities/favorites");
  if (res.error) {
    return { data: [], error: res.error };
  }
  return res;
}

export async function toggleFavorite(
  activityId: string
): Promise<ApiResult<{ isFavorite: boolean; favoritesCount: number }>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.toggleFavorite(activityId);
  }
  const res = await request<{ is_favorite: boolean; favorites_count: number }>(`/activities/${activityId}/favorite`, {
    method: "POST",
  });
  if (res.data) {
    const data = {
      isFavorite: res.data.is_favorite ?? res.data.isFavorite,
      favoritesCount: res.data.favorites_count ?? res.data.favoritesCount,
    };
    trackFavoriteToggle(data.isFavorite);
    return {
      data: {
        isFavorite: data.isFavorite,
        favoritesCount: data.favoritesCount,
      },
    };
  }
  return { data: undefined, error: res.error };
}

export async function isFavorite(
  activityId: string
): Promise<ApiResult<{ isFavorite: boolean; favoritesCount: number }>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.isFavorite(activityId);
  }
  const res = await request<{ is_favorite: boolean; favorites_count: number }>(`/activities/${activityId}/favorite`);
  if (res.data) {
    return {
      data: {
        isFavorite: res.data.is_favorite ?? res.data.isFavorite,
        favoritesCount: res.data.favorites_count ?? res.data.favoritesCount,
      },
    };
  }
  return { data: undefined, error: res.error };
}
