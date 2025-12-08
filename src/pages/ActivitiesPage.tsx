import { useEffect, useState } from "react";
import { Compass, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { ActivityCard } from "@/components/shared/ActivityCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { getActivities } from "@/services/apiClient";
import type { Activity } from "@/types/domain";

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      const result = await getActivities();
      setActivities(result.data);
      setLoading(false);
    };
    fetchActivities();
  }, []);

  return (
    <div>
      <PageHeader
        title="Aktivitäten entdecken"
        description="Stöbere durch Event-Ideen und favorisiere deine Lieblings-Aktivitäten für spätere Abstimmungen."
        action={
          <Button variant="secondary" className="gap-2 rounded-xl">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-80 rounded-2xl bg-secondary/30 animate-pulse"
            />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="Keine Aktivitäten gefunden"
          description="Es wurden noch keine Aktivitäten hinzugefügt."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ActivityCard activity={activity} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
