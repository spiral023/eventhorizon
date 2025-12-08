import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Filter, X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PageHeader } from "@/components/shared/PageHeader";
import { ActivityCard } from "@/components/shared/ActivityCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ActivityFilterPanel, ActivityFilters, defaultFilters } from "@/components/activities/ActivityFilterPanel";
import { getActivities, getFavoriteActivityIds, toggleFavorite } from "@/services/apiClient";
import type { Activity } from "@/types/domain";

export default function ActivitiesPage() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ActivityFilters>(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [activitiesResult, favoritesResult] = await Promise.all([
        getActivities(),
        getFavoriteActivityIds(),
      ]);
      setActivities(activitiesResult.data);
      setFavoriteIds(favoritesResult.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleFavoriteToggle = async (activityId: string) => {
    const result = await toggleFavorite(activityId);
    if (result.data) {
      setFavoriteIds((prev) => [...prev, activityId]);
    } else {
      setFavoriteIds((prev) => prev.filter((id) => id !== activityId));
    }
  };

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      // Favorites filter
      if (filters.favoritesOnly && !favoriteIds.includes(activity.id)) {
        return false;
      }

      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(activity.category)) {
        return false;
      }

      // Region filter
      if (filters.regions.length > 0 && !filters.regions.includes(activity.locationRegion)) {
        return false;
      }

      // Season filter
      if (filters.seasons.length > 0 && !filters.seasons.includes(activity.season)) {
        return false;
      }

      // Risk level filter
      if (filters.riskLevels.length > 0 && !filters.riskLevels.includes(activity.riskLevel)) {
        return false;
      }

      // Price range filter
      if (
        activity.estPricePerPerson < filters.priceRange[0] ||
        (filters.priceRange[1] < 100 && activity.estPricePerPerson > filters.priceRange[1])
      ) {
        return false;
      }

      return true;
    });
  }, [activities, favoriteIds, filters]);

  const activeFilterCount = 
    filters.categories.length +
    filters.regions.length +
    filters.seasons.length +
    filters.riskLevels.length +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 100 ? 1 : 0) +
    (filters.favoritesOnly ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Aktivitäten entdecken"
        description="Stöbere durch Event-Ideen und favorisiere deine Lieblings-Aktivitäten für spätere Abstimmungen."
        action={
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="secondary" className="gap-2 rounded-xl relative">
                <SlidersHorizontal className="h-4 w-4" />
                Filter
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-80">
              <SheetHeader>
                <SheetTitle>Aktivitäten filtern</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <ActivityFilterPanel
                  filters={filters}
                  onChange={setFilters}
                  onReset={() => setFilters(defaultFilters)}
                />
              </div>
            </SheetContent>
          </Sheet>
        }
      />

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-sm text-muted-foreground">Aktive Filter:</span>
          {filters.favoritesOnly && (
            <Button
              variant="secondary"
              size="sm"
              className="gap-1 h-7 rounded-lg"
              onClick={() => setFilters({ ...filters, favoritesOnly: false })}
            >
              Favoriten
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-primary h-7"
            onClick={() => setFilters(defaultFilters)}
          >
            Alle zurücksetzen
          </Button>
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-muted-foreground mb-4">
        {filteredActivities.length} Aktivität{filteredActivities.length !== 1 ? "en" : ""} gefunden
      </p>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-80 rounded-2xl bg-secondary/30 animate-pulse"
            />
          ))}
        </div>
      ) : filteredActivities.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="Keine Aktivitäten gefunden"
          description={
            activeFilterCount > 0
              ? "Versuche andere Filtereinstellungen."
              : "Es wurden noch keine Aktivitäten hinzugefügt."
          }
          action={
            activeFilterCount > 0 && (
              <Button
                variant="secondary"
                className="rounded-xl"
                onClick={() => setFilters(defaultFilters)}
              >
                Filter zurücksetzen
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredActivities.map((activity, index) => (
            <div
              key={activity.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ActivityCard
                activity={activity}
                isFavorite={favoriteIds.includes(activity.id)}
                onFavoriteToggle={handleFavoriteToggle}
                onClick={() => navigate(`/activities/${activity.id}`)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
