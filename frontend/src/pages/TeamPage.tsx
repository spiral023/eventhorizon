import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Heart, Zap, Coffee, Mountain, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { ActivityCard } from "@/components/shared/ActivityCard";
import { getTeamRecommendations, getActivities, getFavoriteActivityIds, toggleFavorite } from "@/services/apiClient";
import type { TeamPreferenceSummary } from "@/services/apiClient";
import type { Activity } from "@/types/domain";
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

export default function TeamPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<TeamPreferenceSummary | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [recsResult, activitiesResult, favoritesResult] = await Promise.all([
        getTeamRecommendations(roomId || "room-1"),
        getActivities(),
        getFavoriteActivityIds(),
      ]);
      setRecommendations(recsResult.data);
      setActivities(activitiesResult.data);
      setFavoriteIds(favoritesResult.data || []);
      setLoading(false);
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

  const recommendedActivities = activities.filter((a) =>
    recommendations?.recommendedActivityIds.includes(a.id)
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary/30 rounded animate-pulse" />
        <div className="h-64 bg-secondary/30 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!recommendations) {
    return null;
  }

  const VibeIcon = vibeIcons[recommendations.teamVibe];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team-Analyse"
        description="KI-gestützte Einblicke in die Präferenzen deines Teams"
      />

      {/* Team Vibe */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/20 rounded-3xl overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/20">
                <VibeIcon className="h-10 w-10 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-primary">KI-Analyse</span>
                </div>
                <h2 className="text-2xl font-bold mb-1">
                  Euer Team-Vibe: {vibeLabels[recommendations.teamVibe]}
                </h2>
                <p className="text-muted-foreground">
                  Basierend auf bisherigen Votings und Favoriten
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-card/60 border-border/50 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Kategorie-Präferenzen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.categoryDistribution.map((cat, index) => (
                <motion.div
                  key={cat.category}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-center gap-4"
                >
                  <Badge className={cn("w-28 justify-center", CategoryColors[cat.category])}>
                    {CategoryLabels[cat.category]}
                  </Badge>
                  <div className="flex-1">
                    <div className="h-3 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.percentage}%` }}
                        transition={{ delay: 0.3 + 0.1 * index, duration: 0.5 }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium w-12 text-right">
                    {cat.percentage}%
                  </span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-card/60 border-border/50 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              KI-Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recommendations.insights.map((insight, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + 0.1 * index }}
                  className="flex items-start gap-3"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                    {index + 1}
                  </div>
                  <p className="text-muted-foreground">{insight}</p>
                </motion.li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recommended Activities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Empfohlene Aktivitäten
            </h3>
            <p className="text-sm text-muted-foreground">
              Basierend auf euren Team-Präferenzen
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recommendedActivities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + 0.1 * index }}
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
