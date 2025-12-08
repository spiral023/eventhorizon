import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ActivityCard } from "@/components/shared/ActivityCard";
import { PageLoading } from "@/components/shared/PageLoading";
import { PageError } from "@/components/shared/PageError";
import { EmptyState } from "@/components/shared/EmptyState";
import { ActivityFilterPanel } from "@/components/activities/ActivityFilterPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal } from "lucide-react";
import { getActivities, getFavoriteActivityIds } from "@/services/apiClient";
import type { Activity } from "@/types/domain";

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
      if (favoritesResult.error) throw new Error(favoritesResult.error.message);

      setActivities(activitiesResult.data);
      setFavoriteIds(favoritesResult.data);
    } catch (err) {
      setError("Aktivitäten konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredActivities = activities.filter((activity) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      activity.title.toLowerCase().includes(query) ||
      activity.locationRegion.toLowerCase().includes(query) ||
      activity.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

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
          onFilterChange={() => {}}
          className="animate-in fade-in slide-in-from-top-4"
        />
      )}

      {filteredActivities.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Keine Aktivitäten gefunden"
          description="Versuche es mit einem anderen Suchbegriff oder ändere die Filter."
          action={
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Suche zurücksetzen
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              isFavorite={favoriteIds.includes(activity.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}