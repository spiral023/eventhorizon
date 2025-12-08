import { useEffect, useState } from "react";
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
import { getActivities, getFavoriteActivityIds, toggleFavorite } from "@/services/apiClient";
import type { Activity } from "@/types/domain";
import { toast } from "sonner";

export default function ActivitiesPage() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ActivityFilters>(defaultFilters);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [activitiesResult, favoritesResult] = await Promise.all([
        getActivities(),
        getFavoriteActivityIds(),
      ]);

      if (activitiesResult.error) throw new Error(activitiesResult.error.message);
      setActivities(activitiesResult.data);
      setFavoriteIds(favoritesResult.data || []);
    } catch (err) {
      setError("Aktivitäten konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredActivities = activities.filter((activity) => {
    // Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        activity.title.toLowerCase().includes(query) ||
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

  if (isLoading) {
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
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {showFilters && (
        <ActivityFilterPanel
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(defaultFilters)}
          className="animate-in fade-in slide-in-from-top-4"
        />
      )}

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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              isFavorite={favoriteIds.includes(activity.id)}
              onFavoriteToggle={async (id) => {
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
              onClick={() => navigate(`/activities/${activity.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
