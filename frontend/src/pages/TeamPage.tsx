import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, TrendingUp, Heart, Zap, Coffee, Mountain, 
  Brain, ShieldCheck, AlertTriangle, Trophy, Users2, 
  BarChart3, Rocket, MessageSquare
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { getTeamRecommendations, getActivities, getFavoriteActivityIds, toggleFavorite, getRooms } from "@/services/apiClient";
import type { TeamPreferenceSummary } from "@/services/apiClient";
import type { Activity, Room } from "@/types/domain";
import { CategoryLabels, CategoryColors } from "@/types/domain";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

const socialVibeLabels = {
  low: "Fokus auf Aktivität",
  medium: "Gute Mischung",
  high: "Starker Austausch",
};

export default function TeamPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<TeamPreferenceSummary | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch rooms to populate the dropdown
      const roomsResult = await getRooms();
      const availableRooms = roomsResult.data || [];
      setRooms(availableRooms);

      let targetRoomId = roomId;

      // If no room in URL, try to use first available room
      if (!targetRoomId && availableRooms.length > 0) {
        targetRoomId = availableRooms[0].id;
      }
      
      const foundRoom = availableRooms.find(r => r.id === targetRoomId);
      setCurrentRoom(foundRoom || null);

      if (!targetRoomId) {
          setLoading(false);
          return;
      }

      try {
        const [recsResult, activitiesResult, favoritesResult] = await Promise.all([
          getTeamRecommendations(targetRoomId),
          getActivities(),
          getFavoriteActivityIds(),
        ]);
        setRecommendations(recsResult.data);
        setActivities(activitiesResult.data);
        setFavoriteIds(favoritesResult.data || []);
      } catch (error) {
        console.error("Failed to fetch team data:", error);
        toast.error("Fehler beim Laden der Team-Daten");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [roomId]);

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
    setActivities((prev) =>
      prev.map((a) =>
        a.id === activityId ? { ...a, favoritesCount: count ?? a.favoritesCount } : a
      )
    );
  };

  const handleRoomChange = (newRoomId: string) => {
    navigate(`/team/${newRoomId}`);
  };

  const recommendedActivities = activities.filter((a) =>
    recommendations?.recommendedActivityIds.includes(a.id)
  );

  if (loading) {
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
            Wir werten die Präferenzen deines Teams aus, um die perfekte Strategie zu berechnen.
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
  if (!loading && (!currentRoom || !recommendations)) {
    return (
      <div className="p-8 text-center">
        <PageHeader title="Team-Analyse" />
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Du bist noch keinem Raum beigetreten. Erstelle oder trete einem Raum bei, um die Team-Analyse zu nutzen.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Safe check for recommendations existence (typescript satisfaction)
  if (!recommendations) return null;

  const VibeIcon = vibeIcons[recommendations.teamVibe];

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Team-Analyse"
        description={`Strategische KI-Einblicke in die DNA von "${currentRoom?.name}"`}
        action={
            rooms.length > 0 ? (
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
          transition={{ delay: 0.1 }}
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
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-card/40 border-border/40 rounded-3xl h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Interessen-Radar
              </CardTitle>
              <CardDescription>
                Bevorzugte Aktivitäten basierend auf euren Favoriten
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {recommendations.categoryDistribution.map((cat, index) => (
                <div key={cat.category} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", CategoryColors[cat.category])} />
                      {CategoryLabels[cat.category]}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {cat.count} {cat.count === 1 ? 'Favorit' : 'Favoriten'}
                      </span>
                      <span className="text-muted-foreground font-mono">{cat.percentage}%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full bg-primary", index === 0 && "bg-gradient-to-r from-primary to-primary/60")}
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.percentage}%` }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Strengths & Challenges */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
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
        </motion.div>
      </div>

      {/* Deep Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-primary/5 border-primary/20 rounded-3xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Tiefen-Insights
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
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="space-y-1">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Rocket className="w-6 h-6 text-primary" />
              Top-Empfehlungen
            </h3>
            <p className="text-muted-foreground">Exklusiv für euer Profil ausgewählt</p>
          </div>
          <Users2 className="w-8 h-8 text-muted-foreground/20" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recommendedActivities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + index * 0.1 }}
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
