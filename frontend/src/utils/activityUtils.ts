import type { Activity, EventCategory, Region, Season, PrimaryGoal } from "@/types/domain";

export interface ActivityFilters {
  categories: EventCategory[];
  regions: Region[];
  seasons: Season[];
  priceRange: [number, number];
  groupSizeRange: [number, number];
  durationRange: [number, number];
  travelTimeRange: [number, number];
  travelTimeWalkingRange: [number, number];
  physicalIntensity: [number, number];
  mentalChallenge: [number, number];
  teamworkLevel: [number, number];
  competitionLevel: [number, number];
  socialInteractionLevel: [number, number];
  primaryGoals: PrimaryGoal[];
  indoorOnly: boolean;
  outdoorOnly: boolean;
  weatherIndependent: boolean;
  favoritesOnly: boolean;
}

export const defaultFilters: ActivityFilters = {
  categories: [],
  regions: [],
  seasons: [],
  priceRange: [0, 200],
  groupSizeRange: [1, 100],
  durationRange: [0, 480], // in minutes
  travelTimeRange: [0, 60], // in minutes
  travelTimeWalkingRange: [0, 60], // in minutes
  physicalIntensity: [0, 5],
  mentalChallenge: [0, 5],
  teamworkLevel: [1, 5],
  competitionLevel: [0, 5],
  socialInteractionLevel: [0, 5],
  primaryGoals: [],
  indoorOnly: false,
  outdoorOnly: false,
  weatherIndependent: false,
  favoritesOnly: false,
};

/**
 * Parses the duration of an activity into minutes.
 */
export const getActivityDurationMinutes = (activity: Activity): number | undefined => {
  if (typeof activity.typicalDurationHours === "number") {
    return activity.typicalDurationHours * 60;
  }
  if (typeof activity.duration === "string") {
    const match = activity.duration.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      return parseFloat(match[1]) * 60;
    }
  }
  return undefined;
};

/**
 * Formats duration in minutes to a human-readable string (e.g., "2h 30m" or "45m").
 */
export const formatDuration = (minutes: number): string => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${minutes}m`;
};

/**
 * Calculates the number of active filters.
 */
export const getActiveFilterCount = (filters: ActivityFilters): number => {
  let count = 0;
  
  if (filters.categories?.length > 0) count += filters.categories.length;
  if (filters.regions?.length > 0) count += filters.regions.length;
  if (filters.seasons?.length > 0) count += filters.seasons.length;
  if (filters.primaryGoals?.length > 0) count += filters.primaryGoals.length;
  
  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 200) count += 1;
  if (filters.groupSizeRange[0] > 1 || filters.groupSizeRange[1] < 100) count += 1;
  if (filters.durationRange[0] > 0 || filters.durationRange[1] < 480) count += 1;
  if (filters.travelTimeRange[0] > 0 || filters.travelTimeRange[1] < 60) count += 1;
  if (filters.travelTimeWalkingRange[0] > 0 || filters.travelTimeWalkingRange[1] < 60) count += 1;
  
  if (filters.physicalIntensity[0] > 0 || filters.physicalIntensity[1] < 5) count += 1;
  if (filters.mentalChallenge[0] > 0 || filters.mentalChallenge[1] < 5) count += 1;
  if (filters.teamworkLevel[0] > 1 || filters.teamworkLevel[1] < 5) count += 1;
  if (filters.competitionLevel[0] > 0 || filters.competitionLevel[1] < 5) count += 1;
  if (filters.socialInteractionLevel[0] > 0 || filters.socialInteractionLevel[1] < 5) count += 1;
  
  if (filters.indoorOnly) count += 1;
  if (filters.outdoorOnly) count += 1;
  if (filters.weatherIndependent) count += 1;
  if (filters.favoritesOnly) count += 1;
  
  return count;
};

/**
 * Simple heuristic to check if an activity is indoor based on tags.
 */
export const isIndoor = (activity: Activity): boolean => {
  return activity.tags.some(tag => tag.toLowerCase() === "indoor");
};

/**
 * Simple heuristic to check if an activity is outdoor based on tags.
 */
export const isOutdoor = (activity: Activity): boolean => {
  return activity.tags.some(tag => tag.toLowerCase() === "outdoor");
};
