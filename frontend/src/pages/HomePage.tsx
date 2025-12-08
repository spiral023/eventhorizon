import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, Users, Compass, TrendingUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoomCard } from "@/components/shared/RoomCard";
import { ActivityCard } from "@/components/shared/ActivityCard";
import { getRooms, getActivities, getFavoriteActivityIds, toggleFavorite } from "@/services/apiClient";
import type { Room, Activity } from "@/types/domain";
import { toast } from "sonner";

export default function HomePage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const [roomsResult, activitiesResult, favoritesResult] = await Promise.all([
        getRooms(),
        getActivities(),
        getFavoriteActivityIds(),
      ]);
      setRooms(roomsResult.data.slice(0, 2));
      setActivities(sortTopByFavorites(activitiesResult.data, 4));
      setFavoriteIds(favoritesResult.data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const sortTopByFavorites = (list: Activity[], take?: number) => {
    const sorted = [...list].sort(
      (a, b) => (b.favoritesCount || 0) - (a.favoritesCount || 0)
    );
    return typeof take === "number" ? sorted.slice(0, take) : sorted;
  };

  const handleFavoriteToggle = async (activityId: string) => {
    const result = await toggleFavorite(activityId);
    if (result.error) {
      toast.error(result.error.message || "Favorit konnte nicht aktualisiert werden.");
      return;
    }
    const isFav = result.data?.isFavorite;
    const count = result.data?.favoritesCount;
    setFavoriteIds((prev) =>
      isFav ? [...prev, activityId] : prev.filter((id) => id !== activityId)
    );
    setActivities((prev) => {
      const updated = prev.map((a) =>
        a.id === activityId ? { ...a, favoritesCount: count ?? a.favoritesCount ?? 0 } : a
      );
      return sortTopByFavorites(updated, 4);
    });
  };

  return (
    <div className="space-y-10">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 border border-primary/20">
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">Willkommen zurück!</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Guten Tag, Max!
          </h1>
          <p className="text-muted-foreground max-w-lg">
            Du hast 2 anstehende Events und 3 offene Abstimmungen. Schau dir die neuesten Aktivitäten an!
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Aktive Räume", value: "4", icon: Users, color: "text-primary" },
          { label: "Aktivitäten favorisiert", value: "12", icon: Compass, color: "text-warning" },
          { label: "Events diesen Monat", value: "3", icon: TrendingUp, color: "text-success" },
          { label: "Offene Votings", value: "3", icon: Sparkles, color: "text-purple-400" },
        ].map((stat, index) => (
          <Card 
            key={stat.label} 
            className="rounded-2xl bg-card/60 border-border/50 animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-secondary/50 ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rooms Section */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-semibold">Deine Räume</h2>
            <p className="text-sm text-muted-foreground">Die letzten aktiven Räume</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="gap-1 text-primary hover:text-primary">
            <Link to="/rooms">
              Alle anzeigen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {rooms.map((room, index) => (
              <div
                key={room.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <RoomCard room={room} onClick={() => navigate(`/rooms/${room.id}`)} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Activities Section */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-semibold">Beliebte Aktivitäten</h2>
            <p className="text-sm text-muted-foreground">Entdecke neue Event-Ideen</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="gap-1 text-primary hover:text-primary">
            <Link to="/activities">
              Alle anzeigen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 rounded-2xl bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {activities.map((activity, index) => (
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
      </section>
    </div>
  );
}
