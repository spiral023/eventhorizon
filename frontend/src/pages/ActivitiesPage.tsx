import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { ActivityCard } from "@/components/shared/ActivityCard";
import { PageLoading } from "@/components/shared/PageLoading";
import { PageError } from "@/components/shared/PageError";
import { EmptyState } from "@/components/shared/EmptyState";
import { ActivityFilterPanel, defaultFilters, type ActivityFilters } from "@/components/activities/ActivityFilterPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getActivities, getFavoriteActivityIds, toggleFavorite } from "@/services/apiClient";
import type { Activity } from "@/types/domain";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";

import { motion, AnimatePresence } from "framer-motion";

const ITEMS_PER_PAGE = 9;

export default function ActivitiesPage() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ActivityFilters>(defaultFilters);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const activeFilterCount =
    (filters.categories?.length || 0) +
    (filters.regions?.length || 0) +
    (filters.seasons?.length || 0) +
    (filters.riskLevels?.length || 0) +
    (filters.primaryGoals?.length || 0) +
    ((filters.priceRange?.[0] > 0 || filters.priceRange?.[1] < 200) ? 1 : 0) +
    ((filters.groupSizeRange?.[0] > 1 || filters.groupSizeRange?.[1] < 100) ? 1 : 0) +
    ((filters.durationRange?.[0] > 0 || filters.durationRange?.[1] < 480) ? 1 : 0) +
    ((filters.travelTimeRange?.[0] > 0 || filters.travelTimeRange?.[1] < 60) ? 1 : 0) +
    ((filters.travelTimeWalkingRange?.[0] > 0 || filters.travelTimeWalkingRange?.[1] < 60) ? 1 : 0) +
    ((filters.physicalIntensity?.[0] > 1 || filters.physicalIntensity?.[1] < 5) ? 1 : 0) +
    ((filters.mentalChallenge?.[0] > 1 || filters.mentalChallenge?.[1] < 5) ? 1 : 0) +
    ((filters.teamworkLevel?.[0] > 1 || filters.teamworkLevel?.[1] < 5) ? 1 : 0) +
    (filters.indoorOnly ? 1 : 0) +
    (filters.outdoorOnly ? 1 : 0) +
    (filters.weatherIndependent ? 1 : 0) +
    (filters.favoritesOnly ? 1 : 0);

  const loadData = useCallback(async () => {
    setIsLoadingActivities(true);
    setError(null);
    try {
      const [activitiesResult, favoritesResult] = await Promise.all([
        getActivities(),
        isAuthenticated ? getFavoriteActivityIds() : Promise.resolve({ data: [] as string[] }),
      ]);

      if (activitiesResult.error) throw new Error(activitiesResult.error.message);
      setActivities(activitiesResult.data);
      setFavoriteIds(favoritesResult.data || []);
    } catch (err) {
      setError("Aktivitäten konnten nicht geladen werden.");
    } finally {
      setIsLoadingActivities(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    loadData();
  }, [authLoading, loadData]);

  const filteredActivities = activities.filter((activity) => {
    const durationMinutes = (() => {
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
    })();

    // Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        activity.title.toLowerCase().includes(query) ||
        (activity.shortDescription?.toLowerCase().includes(query) ?? false) ||
        (activity.longDescription?.toLowerCase().includes(query) ?? false) ||
        (activity.description?.toLowerCase().includes(query) ?? false) ||
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

    // Risk Level Filter
    if (filters.riskLevels.length > 0 && !filters.riskLevels.includes(activity.riskLevel)) {
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
       // Check if ranges overlap
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

    // Favorites Only
    if (filters.favoritesOnly && !favoriteIds.includes(activity.id)) {
      return false;
    }

    // Indoor/Outdoor
    if (filters.indoorOnly && activity.tags.includes("outdoor")) return false; // Simple heuristic, better if explicit field
    if (filters.outdoorOnly && activity.tags.includes("indoor")) return false;

    // Weather Independent
    if (filters.weatherIndependent && activity.weatherDependent) {
      return false;
    }

    return true;
  });

  const sortedActivities = [...filteredActivities].sort(
    (a, b) => (b.favoritesCount || 0) - (a.favoritesCount || 0)
  );

  const visibleActivities = sortedActivities.slice(0, visibleCount);
  const hasMore = visibleCount < sortedActivities.length;

  const loadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  // Reset visible count when filters or search changes
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchQuery, filters]);

  if (isLoadingActivities) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Aktivitäten"
          description="Finde Inspiration für dein nächstes Teamevent"
        />
        <PageLoading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Aktivitäten"
          description="Finde Inspiration für dein nächstes Teamevent"
        />
        <PageError message={error} onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aktivitäten"
        description="Finde Inspiration für dein nächstes Teamevent"
      />

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Suchen nach Titel, Region oder Tags..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-5 min-w-[1.5rem] rounded-full bg-primary/10 text-primary text-xs px-2">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filter</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              <ActivityFilterPanel
                filters={filters}
                onChange={setFilters}
                onReset={() => setFilters(defaultFilters)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {filteredActivities.length === 0 ? (
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
        <div className="space-y-6">
          <motion.div layout className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {visibleActivities.map((activity) => (
                <motion.div
                  layout
                  key={activity.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
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
                      const isFav = result.data?.isFavorite;
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
                className="min-w-[200px]"
              >
                Weitere laden ({sortedActivities.length - visibleCount} verbleibend)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
