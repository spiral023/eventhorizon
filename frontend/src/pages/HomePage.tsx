import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Sparkles, Users, TrendingUp, Heart, Plus, Search, Calendar, CheckCircle2, X, type LucideIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RoomCard } from "@/components/shared/RoomCard";
import { ActivityCard } from "@/components/shared/ActivityCard";
import { EventCard } from "@/components/events/EventCard";
import { JoinRoomDialog } from "@/components/shared/JoinRoomDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { activitiesQueryKey, useActivities } from "@/hooks/use-activities";
import { favoriteActivityIdsQueryKey, useFavoriteActivityIds } from "@/hooks/use-favorite-activity-ids";
import { 
  getRooms, 
  toggleFavorite, 
  getUserStats,
  getUserEvents 
} from "@/services/apiClient";
import type { Room, Activity, UserStats, Event } from "@/types/domain";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { getGreeting } from "@/utils/greeting";
import { cn } from "@/lib/utils";
import { MOTION } from "@/lib/motion";

const EMPTY_ACTIVITIES: Activity[] = [];
const EMPTY_IDS: string[] = [];

const sortRoomsByMembers = (input: Room[]) =>
  [...input].sort((a, b) => {
    const diff = (b.memberCount ?? 0) - (a.memberCount ?? 0);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, "de");
  });

export default function HomePage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [roomCount, setRoomCount] = useState(0);
  const [roomAccessCodesById, setRoomAccessCodesById] = useState<Record<string, string>>({});
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ upcomingEventsCount: 0, openVotesCount: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const favoritesEnabled = isAuthenticated && !authLoading;
  const { data: activitiesData, isLoading: activitiesLoading } = useActivities();
  const { data: favoriteIdsData, isLoading: favoritesLoading } = useFavoriteActivityIds(favoritesEnabled);
  const resolvedActivities = activitiesData ?? EMPTY_ACTIVITIES;
  const resolvedFavoriteIds = favoritesEnabled ? (favoriteIdsData ?? EMPTY_IDS) : EMPTY_IDS;
  const greeting = getGreeting();
  const [isReturningVisitor, setIsReturningVisitor] = useState(false);

  useEffect(() => {
    const hasVisited = localStorage.getItem("hasVisited");
    if (hasVisited) {
      setIsReturningVisitor(true);
    } else {
      localStorage.setItem("hasVisited", "true");
    }
  }, []);

  useEffect(() => {
    setAllActivities(resolvedActivities);
  }, [resolvedActivities]);

  useEffect(() => {
    setFavoriteIds(resolvedFavoriteIds);
  }, [resolvedFavoriteIds]);

  const isLoading = loading || activitiesLoading || (favoritesEnabled && favoritesLoading);

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
    if (authLoading) return;
    const fetchData = async () => {
      setLoading(true);
      const [roomsResult, statsResult, eventsResult] = await Promise.all([
        isAuthenticated ? getRooms() : Promise.resolve({ data: [] as Room[] }),
        isAuthenticated ? getUserStats() : Promise.resolve({ data: { upcomingEventsCount: 0, openVotesCount: 0 } }),
        isAuthenticated ? getUserEvents() : Promise.resolve({ data: [] as Event[] }),
      ]);

      const roomsData = roomsResult.data || [];
      const sortedRooms = sortRoomsByMembers(roomsData);
      setRooms(sortedRooms.slice(0, 3));
      setRoomCount(sortedRooms.length);
      setRoomAccessCodesById(
        Object.fromEntries(roomsData.map((room) => [room.id, room.inviteCode || room.id]))
      );
      
      const eventsData = eventsResult.data || [];
      setEvents(eventsData.slice(0, 3));

      if (statsResult.data) {
        setUserStats(statsResult.data);
      }
      setLoading(false);
    };
    fetchData();
  }, [isAuthenticated, authLoading]);

  const filteredActivities = useMemo(() => {
    let result = [...allActivities];
    
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.shortDescription?.toLowerCase().includes(q) ||
        a.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sort by favorites count
    return result.sort((a, b) => (b.favoritesCount || 0) - (a.favoritesCount || 0)).slice(0, 1);
  }, [allActivities, debouncedSearch]);

  const handleFavoriteToggle = async (activityId: string) => {
    if (!isAuthenticated) {
      toast.error("Bitte anmelden oder registrieren, um Favoriten zu speichern.");
      return;
    }
    const result = await toggleFavorite(activityId);
    if (result.error) {
      toast.error(result.error.message || "Favorit konnte nicht aktualisiert werden.");
      return;
    }
    const isFav = result.data?.isFavorite ?? false;
    const count = result.data?.favoritesCount;
    updateFavoriteCaches(activityId, isFav, count);
    setFavoriteIds((prev) =>
      isFav ? [...prev, activityId] : prev.filter((id) => id !== activityId)
    );
    setAllActivities((prev) => 
      prev.map((a) => a.id === activityId ? { ...a, favoritesCount: count ?? a.favoritesCount ?? 0 } : a)
    );
  };

  return (
    <div className="space-y-12 pb-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20 p-8 md:p-12">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl animate-soft-float" aria-hidden />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl animate-soft-float delay-1000" aria-hidden />
        
        <div className="relative z-10 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {isAuthenticated || isReturningVisitor ? "Willkommen zurück" : "Neu hier?"}
              </span>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                {greeting}, <span className="text-primary">{user?.firstName || "Gast"}</span>!
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                {isAuthenticated 
                  ? `Du bist Teil von ${roomCount} Räumen und hast ${userStats.upcomingEventsCount} aktive Events. Zeit für das nächste Abenteuer!`
                  : "Plane unvergessliche Teamevents, stimme über Aktivitäten ab und finde den perfekten Termin – alles an einem Ort."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {isAuthenticated ? (
                <>
                  <Button size="lg" className="rounded-2xl gap-2 shadow-lg shadow-primary/20" asChild>
                    <Link to="/rooms">
                      <Plus className="h-5 w-5" />
                      Event erstellen
                    </Link>
                  </Button>
                  <JoinRoomDialog
                    trigger={
                      <Button size="lg" variant="outline" className="rounded-2xl gap-2 bg-background/50 backdrop-blur-sm">
                        <Users className="h-5 w-5" />
                        Raum beitreten
                      </Button>
                    }
                  />
                </>
              ) : (
                <>
                  <Button size="lg" className="rounded-2xl gap-2 shadow-lg shadow-primary/20" onClick={() => navigate("/login?mode=register")}>
                    Jetzt starten
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-2xl gap-2" onClick={() => navigate("/login")}>
                    Anmelden
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="hidden lg:grid grid-cols-2 gap-4">
            <StatCard label="Anstehende Events" value={userStats.upcomingEventsCount} icon={Calendar} color="bg-blue-500" delay={200} />
            <StatCard label="Offene Votings" value={userStats.openVotesCount} icon={CheckCircle2} color="bg-green-500" delay={300} />
            <StatCard label="Aktive Räume" value={roomCount} icon={Users} color="bg-primary" delay={400} />
            <StatCard label="Favoriten" value={favoriteIds.length} icon={Heart} color="bg-destructive" delay={500} />
          </div>
        </div>
      </section>

      {/* Mobile Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:hidden">
        <StatCard label="Events" value={userStats.upcomingEventsCount} icon={Calendar} color="bg-blue-500" />
        <StatCard label="Votings" value={userStats.openVotesCount} icon={CheckCircle2} color="bg-green-500" />
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Left Column: Events & Rooms */}
        <div className="lg:col-span-2 space-y-12">
          {/* Upcoming Events */}
          <section>
            <SectionHeader title="Anstehende Events" subtitle="Deine nächsten Termine und Abstimmungen" />
            
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
              </div>
            ) : isAuthenticated ? (
              events.length > 0 ? (
                <div className="grid gap-4">
                  {events.map((event) => {
                    const accessCode = roomAccessCodesById[event.roomId] ?? event.roomId;
                    const eventCode = event.shortCode || event.id;
                    return (
                      <EventCard 
                        key={event.id} 
                        event={event} 
                        onClick={() => navigate(`/rooms/${accessCode}/events/${eventCode}`)} 
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={Calendar} title="Keine anstehenden Events" description="Erstelle ein Event in einem deiner Räume, um zu starten." />
              )
            ) : (
              <AuthRequiredState />
            )}
          </section>

          {/* Rooms */}
          <section>
            <SectionHeader title="Deine Räume" subtitle="Zusammenarbeit in Teams" link="/rooms" linkLabel="Alle Räume" />
            
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
              </div>
            ) : isAuthenticated ? (
              rooms.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {rooms.map((room) => (
                    <RoomCard key={room.id} room={room} onClick={() => navigate(`/rooms/${room.inviteCode}`)} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={Users} title="Noch kein Raum" description="Tritt einem Raum bei oder erstelle einen neuen." />
              )
            ) : (
              <AuthRequiredState />
            )}
          </section>
        </div>

        {/* Right Column: Activities & Quick Actions */}
        <div className="space-y-12">
          {/* Quick Search Activity */}
          <section>
             <h3 className="text-lg font-semibold mb-4">Aktivität finden</h3>
             <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Z.B. Paintball, Klettern..."
                  className="w-full bg-secondary/30 border-border/50 rounded-2xl py-3 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/activities?q=${searchQuery}`)}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
             </div>
             {debouncedSearch && (
               <p className="text-xs text-muted-foreground mt-2 px-1">
                 Ergebnisse für "<span className="text-primary font-medium">{debouncedSearch}</span>"
               </p>
             )}
          </section>

          {/* Popular Activities (Sidebar Style) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {debouncedSearch ? "Gefundene Aktivität" : "Beliebteste Aktivität"}
              </h3>
              <Button variant="link" size="sm" asChild className="text-primary p-0">
                <Link to="/activities">Mehr</Link>
              </Button>
            </div>
            
            <div className="space-y-6">
              {isLoading ? (
                [1, 2].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)
              ) : filteredActivities.length > 0 ? (
                <AnimatePresence mode="popLayout">
                  {filteredActivities.map((activity) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={MOTION.card}
                    >
                      <ActivityCard
                        activity={activity}
                        isFavorite={favoriteIds.includes(activity.id)}
                        onFavoriteToggle={handleFavoriteToggle}
                        onClick={() => navigate(`/activities/${activity.slug}`)}
                        showTags={false}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <div className="text-center py-8 px-4 rounded-2xl bg-secondary/10 border border-dashed border-border">
                  <p className="text-sm text-muted-foreground">Keine passenden Aktivitäten gefunden.</p>
                </div>
              )}
            </div>
          </section>

          {/* Tips / Info */}
          <Card className="rounded-3xl bg-primary/5 border-primary/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4">
              <Sparkles className="h-8 w-8 text-primary/20" />
            </div>
            <CardContent className="p-6 space-y-3">
              <h4 className="font-semibold text-primary">Pro Tipp</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Drücke <strong>Strg+K</strong>, um die Suche zu öffnen und schnell zwischen Seiten, Aktivitäten und Events zu springen.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  delay?: number;
};

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

function StatCard({ label, value, icon: Icon, color, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, ...MOTION.card }}
      className="h-full"
    >
      <Card className="rounded-[2rem] bg-background/60 border-border/50 hover:border-primary/30 transition-all duration-300 group overflow-hidden h-full">
        <CardContent className="p-6 h-full flex flex-col justify-center">
          <div className="flex items-center justify-between gap-4">
            <div className={cn("p-3 rounded-2xl text-white shadow-lg flex-shrink-0", color)}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="text-right min-w-0">
              <p className="text-sm font-medium text-muted-foreground truncate">{label}</p>
              <p className="text-3xl font-bold tracking-tight mt-1 group-hover:text-primary transition-colors">{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SectionHeader({ title, subtitle, link, linkLabel }: { title: string; subtitle: string; link?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {link && linkLabel && (
        <Button variant="ghost" size="sm" asChild className="text-primary hover:bg-primary/10 rounded-xl">
          <Link to={link} className="gap-1">
            {linkLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 rounded-[2rem] border-2 border-dashed border-border/50 bg-secondary/10 text-center">
      <div className="h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[250px]">{description}</p>
    </div>
  );
}

function AuthRequiredState() {
  const navigate = useNavigate();
  return (
    <div className="rounded-[2rem] border border-border/50 bg-card/50 p-8 flex flex-col items-center gap-6 text-center">
      <div className="space-y-2">
        <p className="text-lg font-semibold text-foreground">Inhalte personalisieren</p>
        <p className="text-sm text-muted-foreground max-w-sm">Melde dich an, um deine Räume, Events und Abstimmungen direkt hier zu sehen.</p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" className="rounded-xl px-8" onClick={() => navigate("/login")}>
          Anmelden
        </Button>
        <Button className="rounded-xl px-8" onClick={() => navigate("/login?mode=register")}>
          Registrieren
        </Button>
      </div>
    </div>
  );
}


