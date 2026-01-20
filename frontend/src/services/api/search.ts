import type { ApiResult } from "@/types/api";
import type { ApiSearchResult } from "@/types/apiDomain";
import type { SearchResult } from "./types";
import { getMockAdapter, request, USE_MOCKS } from "./core";
import { mapActivityFromApi, mapEventFromApi, mapRoomFromApi, mapUserFromApi } from "./mappers";

export async function searchGlobal(query: string): Promise<ApiResult<SearchResult>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.searchGlobal(query);
  }

  const result = await request<ApiSearchResult>(`/search?q=${encodeURIComponent(query)}`);

  if (result.data) {
    return {
      data: {
        activities: result.data.activities.map(mapActivityFromApi),
        rooms: result.data.rooms.map(mapRoomFromApi),
        events: result.data.events.map(mapEventFromApi),
        users: result.data.users.map(mapUserFromApi),
      },
    };
  }

  return { data: undefined, error: result.error };
}
