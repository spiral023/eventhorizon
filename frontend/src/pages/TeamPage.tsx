import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, TrendingUp, Heart, Zap, Coffee, Mountain, 
  Brain, ShieldCheck, AlertTriangle, Trophy, Users2, 
  BarChart3, Rocket, MessageSquare, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/PageHeader";
import { ActivityCard } from "@/components/shared/ActivityCard";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getTeamRecommendations, toggleFavorite, getRooms } from "@/services/apiClient";
import type { TeamPreferenceSummary } from "@/services/apiClient";
import type { Activity, Room } from "@/types/domain";
import { CategoryLabels, CategoryColors } from "@/types/domain";
import { cn } from "@/lib/utils";
import { MOTION } from "@/lib/motion";
import { toast } from "sonner";
import { activitiesQueryKey, useActivities } from "@/hooks/use-activities";
import { favoriteActivityIdsQueryKey, useFavoriteActivityIds } from "@/hooks/use-favorite-activity-ids";

const sortRoomsByMembers = (input: Room[]) =>
  [...input].sort((a, b) => {
    const diff = (b.memberCount ?? 0) - (a.memberCount ?? 0);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, "de");
  });

const vibeIcons = {
  action: Zap,
  relax: Coffee,
  mixed: Mountain,
};

const vibeLabels = {
  action: "Aktiv & Abenteuerlustig",
  relax: "Entspannt & Gemütlich",
  mixed: "Ausgewogen & Vielseitig",
};

const EMPTY_ACTIVITIES: Activity[] = [];
const EMPTY_IDS: string[] = [];

const socialVibeLabels = {
  low: "Fokus auf Aktivität",
  medium: "Gute Mischung",
  high: "Starker Austausch",
};

export default function TeamPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [recommendations, setRecommendations] = useState<TeamPreferenceSummary | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const { data: activitiesData, isLoading: activitiesLoading } = useActivities();
  const { data: favoriteIdsData, isLoading: favoritesLoading } = useFavoriteActivityIds(true);
  const resolvedActivities = activitiesData ?? EMPTY_ACTIVITIES;
  const resolvedFavoriteIds = favoriteIdsData ?? EMPTY_IDS;
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [hasEnoughMembers, setHasEnoughMembers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    setActivities(resolvedActivities);
  }, [resolvedActivities]);

  useEffect(() => {
    setFavoriteIds(resolvedFavoriteIds);
  }, [resolvedFavoriteIds]);

  const isLoading = loading || activitiesLoading || favoritesLoading;

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
  const [showSlowLoadingUI, setShowSlowLoadingUI] = useState(false);

  useEffect(() => {
    let slowLoadingTimer: number | undefined;
    
    if (isLoading) {
      // Show intensive loading UI only after 500ms
      slowLoadingTimer = window.setTimeout(() => {
        setShowSlowLoadingUI(true);
      }, 500);
    } else {
      setShowSlowLoadingUI(false);
    }
    
    return () => {
      if (slowLoadingTimer) window.clearTimeout(slowLoadingTimer);
    };
  }, [isLoading]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setRoomsError(null);
      setRecommendationsError(null);
      
      // Fetch rooms to populate the dropdown
      const roomsResult = await getRooms();
      if (roomsResult.error) {
        setRooms([]);
        setCurrentRoom(null);
        setHasEnoughMembers(false);
        setRecommendations(null);
        setRoomsError(roomsResult.error.message || "Räume konnten nicht geladen werden.");
        setLoading(false);
        return;
      }
      const availableRooms = roomsResult.data || [];
      const sortedRooms = sortRoomsByMembers(availableRooms);
      const eligibleRooms = sortedRooms.filter((room) => (room.memberCount ?? 0) >= 2);
      setRooms(sortedRooms);

      let targetRoomId = roomId;

      // If no room in URL, try to use first available room
      if (!targetRoomId && sortedRooms.length > 0) {
        targetRoomId = eligibleRooms.length > 0 ? eligibleRooms[0].id : sortedRooms[0].id;
      }
      
      const foundRoom = sortedRooms.find(r => r.id === targetRoomId);
      setCurrentRoom(foundRoom || null);
      const roomHasEnoughMembers = (foundRoom?.memberCount ?? 0) >= 2;
      setHasEnoughMembers(roomHasEnoughMembers);

      if (!targetRoomId) {
          setLoading(false);
          return;
      }
      if (!roomHasEnoughMembers) {
        setRecommendations(null);
        setActivities([]);
        setFavoriteIds([]);
        setLoading(false);
        return;
      }

      try {
        const recsResult = await getTeamRecommendations(targetRoomId);
        if (recsResult.error || !recsResult.data) {
          setRecommendations(null);
          setRecommendationsError(
            recsResult.error?.message || "Team-Analyse konnte nicht geladen werden."
          );
        } else {
          setRecommendations(recsResult.data);
        }
      } catch (error) {
        console.error("Failed to fetch team data:", error);
        toast.error("Fehler beim Laden der Team-Daten");
        setRecommendationsError("Team-Analyse konnte nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [roomId, refreshNonce]);

  const handleFavoriteToggle = async (activityId: string) => {
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
    setActivities((prev) =>
      prev.map((a) =>
        a.id === activityId ? { ...a, favoritesCount: count ?? a.favoritesCount } : a
      )
    );
  };

  const handleRoomChange = (newRoomId: string) => {
    navigate(`/team/${newRoomId}`);
  };

  const recommendedActivities = recommendations?.recommendedActivityIds?.length
    ? activities.filter((a) => recommendations.recommendedActivityIds.includes(a.id))
    : [];

  if (isLoading) {
    if (!showSlowLoadingUI) return null;
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in duration-700">
        <div className="relative">
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center"
          >
            <Brain className="w-12 h-12 text-primary opacity-50" />
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-primary/20 rounded-full blur-2xl -z-10"
          />
        </div>
        
        <div className="text-center space-y-3 max-w-sm">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            KI-Analyse läuft...
          </h3>
          <p className="text-muted-foreground animate-pulse">
            Wir werten dein Team aus, um die perfekte Strategie zu berechnen. Dies dauert ca. 20-30 Sekunden und erfolgt nur nach Änderungen.
          </p>
        </div>

        <div className="grid gap-4 w-full max-w-md">
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 8, ease: "linear", repeat: Infinity }}
              className="h-full bg-primary"
            />
          </div>
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            <span>Datenabgleich</span>
            <span>Profil-Mapping</span>
            <span>Synergie-Check</span>
          </div>
        </div>
      </div>
    );
  }

  // If loading is done but no room/recommendations found (e.g. user has no rooms)
  if (!isLoading) {
    if (roomsError) {
      return (
        <div className="p-8 text-center">
          <PageHeader title="Team-Analyse" />
          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-muted-foreground">{roomsError}</p>
              <Button onClick={() => setRefreshNonce((prev) => prev + 1)} className="rounded-xl">
                Erneut versuchen
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!currentRoom) {
      return (
        <div className="p-8 text-center">
          <PageHeader title="Team-Analyse" />
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                {roomId
                  ? "Dieser Raum ist nicht verfügbar oder du hast keinen Zugriff."
                  : "Du bist noch keinem Raum beigetreten. Erstelle oder trete einem Raum bei, um die Team-Analyse zu nutzen."}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!hasEnoughMembers) {
      return (
        <div className="p-8 text-center">
          <PageHeader title="Team-Analyse" />
          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-muted-foreground">
                Die Team-Analyse ist erst ab zwei Mitgliedern im Raum verfügbar.
              </p>
              {currentRoom.inviteCode && (
                <Button onClick={() => navigate(`/rooms/${currentRoom.inviteCode}`)} className="rounded-xl">
                  Mitglieder einladen
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    if (recommendationsError || !recommendations) {
      return (
        <div className="p-8 text-center">
          <PageHeader title="Team-Analyse" />
          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-muted-foreground">
                {recommendationsError || "Die Team-Analyse ist aktuell nicht verfügbar."}
              </p>
              <Button onClick={() => setRefreshNonce((prev) => prev + 1)} className="rounded-xl">
                Erneut versuchen
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Safe check for recommendations existence (typescript satisfaction)
  if (!recommendations) return null;

  const VibeIcon = vibeIcons[recommendations.teamVibe];
  const formatPercent = (value: number) =>
    new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
  const formatPercentInteger = (value: number) =>
    new Intl.NumberFormat("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  const formatPreference = (value?: number) =>
    typeof value === "number"
      ? new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)
      : "–";

  const teamPreferenceItems = [
    {
      key: "physical",
      label: "Körperliche Aktivität",
      icon: Zap,
      value: recommendations.teamPreferences?.physical,
    },
    {
      key: "mental",
      label: "Mentale Herausforderung",
      icon: Brain,
      value: recommendations.teamPreferences?.mental,
    },
    {
      key: "social",
      label: "Soziale Interaktion",
      icon: MessageSquare,
      value: recommendations.teamPreferences?.social,
    },
    {
      key: "competition",
      label: "Wettbewerbslevel",
      icon: Trophy,
      value: recommendations.teamPreferences?.competition,
    },
  ];

  const teamPreferenceRanking = teamPreferenceItems
    .filter((item): item is (typeof teamPreferenceItems)[number] & { value: number } => typeof item.value === "number")
    .sort((a, b) => b.value - a.value);
  const participation = recommendations.favoritesParticipation;
  const preferencesCoverage = recommendations.preferencesCoverage;
  const participationLabel =
    participation
      ? participation.percentage >= 75
        ? "Hohe Beteiligung"
        : participation.percentage >= 50
        ? "Mittlere Beteiligung"
        : "Geringe Beteiligung"
      : "Beteiligung";
  const coverageLabel =
    preferencesCoverage
      ? preferencesCoverage.percentage >= 75
        ? "Hohe Präferenz-Abdeckung"
        : preferencesCoverage.percentage >= 50
        ? "Mittlere Präferenz-Abdeckung"
        : "Geringe Präferenz-Abdeckung"
      : "Präferenz-Abdeckung";

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Team-Analyse"
        description={`Strategische KI-Einblicke in die DNA von "${currentRoom?.name}"`}
        action={
            rooms.length > 1 ? (
                <div className="w-full sm:w-[250px]">
                     <Select value={currentRoom?.id} onValueChange={handleRoomChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Raum auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
            ) : null
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Personality Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2"
        >
          <Card className="h-full bg-gradient-to-br from-primary/15 via-primary/5 to-background border-primary/20 rounded-3xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Brain className="w-32 h-32 text-primary" />
            </div>
            <CardContent className="p-8 relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  KI-Profil
                </div>
                <Badge variant="outline" className="bg-background/50 backdrop-blur-sm border-primary/20">
                  {recommendations.preferredGoals[0] || "Teambuilding"}
                </Badge>
              </div>
              
              <h2 className="text-4xl font-black tracking-tight mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {recommendations.teamPersonality}
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-xl">
                Euer Team zeichnet sich durch eine {recommendations.teamVibe === 'action' ? 'hohe Dynamik' : recommendations.teamVibe === 'relax' ? 'gelassene Atmosphäre' : 'ausgewogene Mischung'} aus.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Team Vibe</span>
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <VibeIcon className="w-4 h-4 text-primary" />
                    {vibeLabels[recommendations.teamVibe]}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Social Level</span>
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    {socialVibeLabels[recommendations.socialVibe]}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mitglieder</span>
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <Users2 className="w-4 h-4 text-primary" />
                    {recommendations.memberCount} {recommendations.memberCount === 1 ? 'Person' : 'Personen'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Synergy Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ...MOTION.card }}
        >
          <Card className="h-full bg-card/40 border-border/40 rounded-3xl flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
            <div className="relative z-10 space-y-4 w-full">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Synergy Score</h3>
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    className="text-secondary"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r="58"
                    cx="64"
                    cy="64"
                  />
                  <motion.circle
                    className="text-primary"
                    strokeWidth="8"
                    strokeDasharray={364.4}
                    initial={{ strokeDashoffset: 364.4 }}
                    animate={{ strokeDashoffset: 364.4 - (364.4 * recommendations.synergyScore) / 100 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="58"
                    cx="64"
                    cy="64"
                  />
                </svg>
                <span className="absolute text-3xl font-black">{Math.round(recommendations.synergyScore)}%</span>
              </div>
              <p className="text-sm text-muted-foreground px-4">
                {recommendations.synergyScore > 80 ? "Spitzen-Synergie im Team!" : recommendations.synergyScore > 50 ? "Gute Basis für Events." : "Diverse Profile, hohe Flexibilität."}
              </p>
              <div className="pt-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                   {recommendations.synergyScore > 75 ? "Hohe Synergie" : "Flexibles Team"}
                </Badge>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Preferences */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, ...MOTION.card }}
        >
          <Card className="bg-card/40 border-border/40 rounded-3xl h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Interessen-Radar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wide">
                  <span>Team-Präferenzen (Ø 0–5)</span>
                  <span>Ranking</span>
                </div>
                {teamPreferenceRanking.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {teamPreferenceRanking.map((item, index) => {
                      const Icon = item.icon;
                      const minLevel = Math.max(0, Math.floor(item.value));
                      return (
                        <Link
                          key={item.key}
                          to={`/activities?pref=${encodeURIComponent(item.key)}&min=${minLevel}`}
                          className="block rounded-xl transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          aria-label={`Aktivitäten mit ${item.label} ab ${minLevel} anzeigen`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground">
                                  {index + 1}
                                </span>
                                <Icon className="h-4 w-4 text-primary/80" />
                                <span className="font-medium">{item.label}</span>
                              </div>
                              <span className="text-muted-foreground font-mono">
                                {formatPreference(item.value)}/5
                              </span>
                            </div>
                            <Progress value={(item.value / 5) * 100} className="h-2" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Keine Team-Präferenzen vorhanden.
                  </p>
                )}
              </div>
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wide">
                  <span>Favoriten-Verteilung</span>
                  <span>Ranking</span>
                </div>
                <div className="mt-3 space-y-3">
                  {recommendations.categoryDistribution.map((cat, index) => (
                    <Link
                      key={cat.category}
                      to={`/activities?category=${encodeURIComponent(cat.category)}`}
                      className="block rounded-xl transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      aria-label={`Aktivitäten in der Kategorie ${CategoryLabels[cat.category]} anzeigen`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground">
                              {index + 1}
                            </span>
                            <span className={cn("h-2 w-2 rounded-full", CategoryColors[cat.category])} />
                            <span className="font-medium">{CategoryLabels[cat.category]}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground font-mono">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-1">
                                  {formatPercentInteger(cat.percentage)}%
                                  <span className="text-muted-foreground/60">·</span>
                                  {cat.count}
                                  <Heart className="h-3.5 w-3.5 text-pink-500/80" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs">
                                <p className="text-xs leading-relaxed text-foreground">
                                  Der Prozentwert zeigt, wie beliebt diese Kategorie
                                  im Team ist. Er zeigt den Anteil an Favoriten der
                                  Kategorie im Verhältnis zu der Anzahl der
                                  Aktivitäten der Kategorie. Die Zahl daneben zeigt,
                                  wie viele Aktivitäten dieser Kategorie favorisiert
                                  wurden.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        <Progress value={cat.percentage} className="h-2" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Strengths & Challenges */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, ...MOTION.card }}
          className="space-y-6"
        >
          <Card className="bg-green-500/5 border-green-500/20 rounded-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-600 text-lg">
                <ShieldCheck className="w-5 h-5" />
                Team-Stärken
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3">
                {recommendations.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Trophy className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/5 border-amber-500/20 rounded-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-amber-600 text-lg">
                <AlertTriangle className="w-5 h-5" />
                Herausforderungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3">
                {recommendations.challenges.map((c, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                    {c}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-sky-500/5 border-sky-500/20 rounded-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sky-600 text-lg">
                <TrendingUp className="w-5 h-5" />
                Beteiligung & Präferenzen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3">
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-1.5" />
                  {participation
                    ? `${participationLabel}: ${participation.count}/${participation.total} Mitglieder haben Favoriten gesetzt (${formatPercent(participation.percentage)}%).`
                    : "Noch keine Favoriten vorhanden."}
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-1.5" />
                  {preferencesCoverage
                    ? `${coverageLabel}: ${preferencesCoverage.count}/${preferencesCoverage.total} Mitglieder haben Präferenzen gesetzt (${formatPercent(preferencesCoverage.percentage)}%).`
                    : "Noch keine Präferenzen vorhanden."}
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Deep Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, ...MOTION.card }}
      >
        <Card className="bg-primary/5 border-primary/20 rounded-3xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Deep-Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {recommendations.insights.map((insight, index) => (
              <div 
                key={index} 
                className="p-4 rounded-2xl bg-background/50 border border-border/50 relative group hover:border-primary/30 transition-colors"
              >
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shadow-lg">
                  {index + 1}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {insight}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, ...MOTION.card }}
      >
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="space-y-1">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Rocket className="w-6 h-6 text-primary" />
              Top-Empfehlungen
            </h3>
            <p className="text-muted-foreground">Exklusiv für diesen Raum ausgewählt</p>
          </div>
          <Users2 className="w-8 h-8 text-muted-foreground/20" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recommendedActivities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + index * 0.1, ...MOTION.card }}
            >
              <ActivityCard
                activity={activity}
                isFavorite={favoriteIds.includes(activity.id)}
                onFavoriteToggle={handleFavoriteToggle}
                onClick={() => navigate(`/activities/${activity.slug}`)}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
