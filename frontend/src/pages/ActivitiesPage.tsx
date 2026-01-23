import { useEffect, useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { ActivityCard } from "@/components/shared/ActivityCard";
import { PageError } from "@/components/shared/PageError";
import { EmptyState } from "@/components/shared/EmptyState";
import { ActivityFilterPanel } from "@/components/activities/ActivityFilterPanel";
import { ActivityCardSkeleton } from "@/components/activities/ActivityCardSkeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toggleFavorite } from "@/services/apiClient";
import type { Activity } from "@/types/domain";
import { CategoryLabels } from "@/types/domain";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { activitiesQueryKey, useActivities } from "@/hooks/use-activities";
import { favoriteActivityIdsQueryKey, useFavoriteActivityIds } from "@/hooks/use-favorite-activity-ids";
import { MOTION } from "@/lib/motion";
import { 
  getActivityDurationMinutes, 
  getActiveFilterCount, 
  isIndoor, 
  isOutdoor,
  type ActivityFilters,
  defaultFilters
} from "@/utils/activityUtils";

import { motion, AnimatePresence } from "framer-motion";

const ITEMS_PER_PAGE = 9;
const EMPTY_ACTIVITIES: Activity[] = [];
const EMPTY_IDS: string[] = [];

const ACTIVITY_SORT_OPTIONS = [
  { value: "favorites", label: "Favoriten" },
  { value: "upvotes", label: "Dafür-Stimmen" },
  { value: "externalRating", label: "Externe Bewertung" },
  { value: "score", label: "Score" },
] as const;

type ActivitySortKey = (typeof ACTIVITY_SORT_OPTIONS)[number]["value"];

export default function ActivitiesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [filters, setFilters] = useState<ActivityFilters>(defaultFilters);
  const [sortBy, setSortBy] = useState<ActivitySortKey>("favorites");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const isMobile = useIsMobile();

  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters]);
  const openSectionsFromParams = useMemo(() => {
    if (isMobile) return undefined;
    const sections = new Set<string>();
    const categoryParam = searchParams.get("category");
    if (categoryParam && categoryParam in CategoryLabels) {
      sections.add("category");
    }
    const prefParam = searchParams.get("pref");
    if (prefParam === "physical") sections.add("physical");
    if (prefParam === "mental") sections.add("mental");
    if (prefParam === "social") sections.add("social");
    if (prefParam === "competition") sections.add("competition");
    return sections.size > 0 ? Array.from(sections) : undefined;
  }, [isMobile, searchParams]);

  const favoritesEnabled = isAuthenticated && !authLoading;
  const {
    data: activitiesData,
    isLoading: isLoadingActivities,
    error: activitiesError,
    refetch: refetchActivities,
  } = useActivities();
  const {
    data: favoriteIdsData,
    isLoading: isLoadingFavorites,
    refetch: refetchFavorites,
  } = useFavoriteActivityIds(favoritesEnabled);
  const resolvedActivities = activitiesData ?? EMPTY_ACTIVITIES;
  const resolvedFavoriteIds = favoritesEnabled ? (favoriteIdsData ?? EMPTY_IDS) : EMPTY_IDS;

  useEffect(() => {
    setActivities(resolvedActivities);
  }, [resolvedActivities]);

  useEffect(() => {
    setFavoriteIds(resolvedFavoriteIds);
  }, [resolvedFavoriteIds]);

  const isLoading = isLoadingActivities || (favoritesEnabled && isLoadingFavorites);
  const error = activitiesError ? "Aktivitäten konnten nicht geladen werden." : null;
  const handleRetry = () => {
    refetchActivities();
    if (favoritesEnabled) {
      refetchFavorites();
    }
  };

  const updateFavoriteCaches = (activityId: string, isFavorite: boolean, favoritesCount?: number) => {
    queryClient.setQueryData<string[]>(favoriteActivityIdsQueryKey, (prev) => {
      const next = prev ?? EMPTY_IDS;
      if (isFavorite) {
        return next.includes(activityId) ? next : [...next, activityId];
      }
      return next.filter((id) => id !== activityId);
    });

    if (typeof favoritesCount === "number") {
      queryClient.setQueryData<Activity[]>(activitiesQueryKey(), (prev) =>
        (prev ?? EMPTY_ACTIVITIES).map((activity) =>
          activity.id === activityId
            ? { ...activity, favoritesCount }
            : activity
        )
      );
    }
  };

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam && categoryParam in CategoryLabels) {
      const categoryKey = categoryParam as keyof typeof CategoryLabels;
      setFilters((prev) => ({ ...prev, categories: [categoryKey] }));
    }
    const queryParam = searchParams.get("q");
    if (queryParam !== null) {
      setSearchQuery(queryParam);
    } else {
      setSearchQuery("");
    }
    const prefParam = searchParams.get("pref");
    const minParam = searchParams.get("min");
    const minValue = minParam ? Math.max(0, Math.min(5, Math.floor(Number(minParam)))) : undefined;
    if (prefParam && typeof minValue === "number" && !Number.isNaN(minValue)) {
      setFilters((prev) => {
        const next = { ...prev };
        if (prefParam === "physical") next.physicalIntensity = [minValue, 5];
        if (prefParam === "mental") next.mentalChallenge = [minValue, 5];
        if (prefParam === "social") next.socialInteractionLevel = [minValue, 5];
        if (prefParam === "competition") next.competitionLevel = [minValue, 5];
        return next;
      });
    }
  }, [searchParams]);

  useEffect(() => {
    const currentQuery = searchParams.get("q") ?? "";
    const nextQuery = debouncedSearchQuery.trim();
    if (nextQuery === "") {
      if (currentQuery === "") return;
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("q");
      setSearchParams(nextParams, { replace: true });
      return;
    }
    if (currentQuery === nextQuery) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("q", nextQuery);
    setSearchParams(nextParams, { replace: true });
  }, [debouncedSearchQuery, searchParams, setSearchParams]);

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      const durationMinutes = getActivityDurationMinutes(activity);

      // Search Query
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        const matchesSearch = (
          activity.title.toLowerCase().includes(query) ||
          (activity.shortDescription?.toLowerCase().includes(query) ?? false) ||
          (activity.longDescription?.toLowerCase().includes(query) ?? false) ||
          activity.locationRegion.toLowerCase().includes(query) ||
          activity.tags.some((tag) => tag.toLowerCase().includes(query))
        );
        if (!matchesSearch) return false;
      }

      // Category Filter
      if (filters.categories.length > 0 && !filters.categories.includes(activity.category)) {
        return false;
      }

      // Region Filter
      if (filters.regions.length > 0 && !filters.regions.includes(activity.locationRegion)) {
        return false;
      }

      // Season Filter
      if (filters.seasons.length > 0 && !filters.seasons.includes(activity.season)) {
        return false;
      }

      // Primary Goal Filter
      if (filters.primaryGoals.length > 0 && (!activity.primaryGoal || !filters.primaryGoals.includes(activity.primaryGoal))) {
        return false;
      }

      // Price Range
      if (activity.estPricePerPerson !== undefined) {
        if (activity.estPricePerPerson < filters.priceRange[0]) return false;
        if (filters.priceRange[1] < 200 && activity.estPricePerPerson > filters.priceRange[1]) return false;
      }

      // Group Size
      if (activity.groupSizeMin !== undefined && activity.groupSizeMax !== undefined) {
         if (activity.groupSizeMax < filters.groupSizeRange[0]) return false;
         if (filters.groupSizeRange[1] < 100 && activity.groupSizeMin > filters.groupSizeRange[1]) return false;
      }

      // Duration
      if (durationMinutes !== undefined) {
        if (durationMinutes < filters.durationRange[0]) return false;
        if (filters.durationRange[1] < 480 && durationMinutes > filters.durationRange[1]) return false;
      }

      // Travel Time Driving
      if (activity.travelTimeMinutes !== undefined) {
        if (activity.travelTimeMinutes < filters.travelTimeRange[0]) return false;
        if (filters.travelTimeRange[1] < 60 && activity.travelTimeMinutes > filters.travelTimeRange[1]) return false;
      }

      // Travel Time Walking
      if (activity.travelTimeMinutesWalking !== undefined) {
        if (activity.travelTimeMinutesWalking < filters.travelTimeWalkingRange[0]) return false;
        if (filters.travelTimeWalkingRange[1] < 60 && activity.travelTimeMinutesWalking > filters.travelTimeWalkingRange[1]) return false;
      }

      // Physical intensity
      if (activity.physicalIntensity !== undefined) {
        if (activity.physicalIntensity < filters.physicalIntensity[0]) return false;
        if (activity.physicalIntensity > filters.physicalIntensity[1]) return false;
      }

      // Mental challenge
      if (activity.mentalChallenge !== undefined) {
        if (activity.mentalChallenge < filters.mentalChallenge[0]) return false;
        if (activity.mentalChallenge > filters.mentalChallenge[1]) return false;
      }

      // Teamwork level
      if (activity.teamworkLevel !== undefined) {
        if (activity.teamworkLevel < filters.teamworkLevel[0]) return false;
        if (activity.teamworkLevel > filters.teamworkLevel[1]) return false;
      }

      // Competition level
      if (activity.competitionLevel !== undefined) {
        if (activity.competitionLevel < filters.competitionLevel[0]) return false;
        if (activity.competitionLevel > filters.competitionLevel[1]) return false;
      }

      // Social interaction level
      if (activity.socialInteractionLevel !== undefined) {
        if (activity.socialInteractionLevel < filters.socialInteractionLevel[0]) return false;
        if (activity.socialInteractionLevel > filters.socialInteractionLevel[1]) return false;
      }

      // Favorites Only
      if (filters.favoritesOnly && !favoriteIds.includes(activity.id)) {
        return false;
      }

      // Indoor/Outdoor
      if (filters.indoorOnly && isOutdoor(activity)) return false;
      if (filters.outdoorOnly && isIndoor(activity)) return false;

      // Weather Independent
      if (filters.weatherIndependent && activity.weatherDependent) {
        return false;
      }

      return true;
    });
  }, [activities, debouncedSearchQuery, filters, favoriteIds]);

  const sortedActivities = useMemo(() => {
    const getScore = (activity: Activity) =>
      [
        activity.socialInteractionLevel,
        activity.mentalChallenge,
        activity.competitionLevel,
        activity.physicalIntensity,
      ].reduce((sum, value) => sum + (typeof value === "number" ? value : 0), 0);

    const getSortValue = (activity: Activity) => {
      switch (sortBy) {
        case "upvotes":
          return activity.totalUpvotes ?? 0;
        case "externalRating":
          return activity.externalRating ?? 0;
        case "score":
          return getScore(activity);
        case "favorites":
        default:
          return activity.favoritesCount ?? 0;
      }
    };

    return [...filteredActivities].sort((a, b) => {
      const diff = getSortValue(b) - getSortValue(a);
      if (diff !== 0) return diff;
      return a.title.localeCompare(b.title, "de");
    });
  }, [filteredActivities, sortBy]);

  const visibleActivities = useMemo(() => {
    if (!isMobile) return sortedActivities;
    return sortedActivities.slice(0, visibleCount);
  }, [sortedActivities, visibleCount, isMobile]);

  const hasMore = isMobile && visibleCount < sortedActivities.length;

  const loadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  // Reset visible count when filters or search changes
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [debouncedSearchQuery, filters, sortBy]);

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Aktivitäten"
          description="Finde Inspiration für dein nächstes Teamevent"
        />
        <PageError message={error} onRetry={handleRetry} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aktivitäten"
        description="Finde Inspiration für dein nächstes Teamevent"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* Desktop Sidebar Filter */}
        <aside className="hidden lg:block space-y-4">
          <div className="sticky top-24 space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filter
              </h3>
              <ActivityFilterPanel
                filters={filters}
                onChange={setFilters}
                onReset={() => setFilters(defaultFilters)}
                defaultOpenSections={openSectionsFromParams}
              />
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          {/* Search & Mobile Filter Toggle */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Titel, Region oder Tags suchen..."
                className="pl-10 h-11 bg-card/50 border-border/50 focus:bg-card transition-colors rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="w-full sm:w-[220px]">
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as ActivitySortKey)}>
                <SelectTrigger
                  className="h-11 rounded-xl bg-card/50 border-border/50"
                  aria-label="Sortierung"
                >
                  <SelectValue placeholder="Sortieren nach" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden gap-2 h-11 px-4 rounded-xl border-border/50 bg-card/50">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle>Filter</SheetTitle>
                </SheetHeader>
                <ActivityFilterPanel
                  filters={filters}
                  onChange={setFilters}
                  onReset={() => setFilters(defaultFilters)}
                  defaultOpenSections={openSectionsFromParams}
                />
              </SheetContent>
            </Sheet>
          </div>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ActivityCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Keine Aktivitäten gefunden"
              description="Versuche es mit einem anderen Suchbegriff oder ändere die Filter."
              action={
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSearchQuery("")}>
                    Suche zurücksetzen
                  </Button>
                  <Button variant="outline" onClick={() => setFilters(defaultFilters)}>
                    Filter zurücksetzen
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{sortedActivities.length}</span> Aktivitäten gefunden
                </p>
              </div>

              <motion.div layout className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {visibleActivities.map((activity) => (
                    <motion.div
                      layout
                      key={activity.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={MOTION.card}
                    >
                      <ActivityCard
                        activity={activity}
                        isFavorite={favoriteIds.includes(activity.id)}
                        onFavoriteToggle={async (id) => {
                          if (!isAuthenticated) {
                            toast.error("Bitte anmelden oder registrieren, um Favoriten zu speichern.");
                            return;
                          }
                          const result = await toggleFavorite(id);
                          if (result.error) {
                            toast.error(result.error.message || "Favorit konnte nicht aktualisiert werden.");
                            return;
                          }
                          const isFav = result.data?.isFavorite ?? false;
                          updateFavoriteCaches(id, isFav, result.data?.favoritesCount);
                          setFavoriteIds((prev) =>
                            isFav ? [...prev, id] : prev.filter((favId) => favId !== id)
                          );
                          setActivities((prev) =>
                            prev.map((a) =>
                              a.id === id ? { ...a, favoritesCount: result.data?.favoritesCount ?? a.favoritesCount } : a
                            )
                          );
                        }}
                        showTags={false}
                        onClick={() => navigate(`/activities/${activity.slug}`)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={loadMore}
                    className="min-w-[240px] h-12 rounded-xl border-border/50 hover:bg-card hover:border-primary/30 hover:text-foreground transition-all shadow-sm"
                  >
                    Weitere laden ({sortedActivities.length - visibleCount} verbleibend)
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
