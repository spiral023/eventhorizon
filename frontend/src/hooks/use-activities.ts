import { useQuery } from "@tanstack/react-query";
import { getActivities } from "@/services/apiClient";
import type { Activity } from "@/types/domain";

export const activitiesQueryKey = (roomId?: string) => ["activities", roomId ?? "all"];

const fetchActivities = async (roomId?: string): Promise<Activity[]> => {
  const result = await getActivities(roomId);
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data ?? [];
};

export function useActivities(roomId?: string, enabled = true) {
  return useQuery({
    queryKey: activitiesQueryKey(roomId),
    queryFn: () => fetchActivities(roomId),
    enabled,
  });
}
