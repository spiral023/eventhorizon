import { useQuery } from "@tanstack/react-query";
import { getFavoriteActivityIds } from "@/services/apiClient";

export const favoriteActivityIdsQueryKey = ["favorite-activity-ids"];

const fetchFavoriteActivityIds = async (): Promise<string[]> => {
  const result = await getFavoriteActivityIds();
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data ?? [];
};

export function useFavoriteActivityIds(enabled = true) {
  return useQuery({
    queryKey: favoriteActivityIdsQueryKey,
    queryFn: fetchFavoriteActivityIds,
    enabled,
  });
}
