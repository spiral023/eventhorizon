import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Euro, 
  Clock, 
  Users, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Star,
  Zap,
  Brain,
  Heart,
  AlertTriangle,
  Car,
  FootprintsIcon,
  Calendar,
  Target,
  Accessibility,
  CloudSun
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader";
import { ScaleBar } from "@/components/shared/ScaleBar";
import { getActivityById, isFavorite, toggleFavorite } from "@/services/apiClient";
import type { Activity } from "@/types/domain";
import { 
  CategoryLabels, 
  CategoryColors, 
  RegionLabels, 
  SeasonLabels,
  RiskLevelLabels,
  RiskLevelColors
} from "@/types/domain";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PrimaryGoalLabels: Record<string, string> = {
  teambuilding: "Teambuilding",
  fun: "Spaß & Unterhaltung",
  reward: "Belohnung & Genuss",
  celebration: "Feier",
  networking: "Networking",
};

export default function ActivityDetailPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!activityId) return;
      const [activityResult, favResult] = await Promise.all([
        getActivityById(activityId),
        isFavorite(activityId)
      ]);
      setActivity(activityResult.data);
      setIsFav(favResult.data?.isFavorite ?? false);
      setFavoriteCount(
        favResult.data?.favoritesCount ?? activityResult.data?.favoritesCount ?? 0
      );
      setLoading(false);
    };
    fetchActivity();
  }, [activityId]);

  const handleFavoriteToggle = async () => {
    if (!activityId) return;
    const result = await toggleFavorite(activityId);
    if (result.error) {
      toast.error(result.error.message || "Favorit konnte nicht aktualisiert werden");
      return;
    }
    const isFavorite = result.data?.isFavorite ?? false;
    const count = result.data?.favoritesCount ?? favoriteCount;
    setIsFav(isFavorite);
    setFavoriteCount(count);
    setActivity((prev) => (prev ? { ...prev, favoritesCount: count } : prev));
    toast.success(isFavorite ? "Zu Favoriten hinzugefügt" : "Aus Favoriten entfernt");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary/50 rounded animate-pulse" />
        <div className="h-[400px] bg-secondary/30 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Aktivität nicht gefunden"
          description="Die gesuchte Aktivität existiert nicht."
        />
        <Button asChild variant="secondary">
          <Link to="/activities">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zu Aktivitäten
          </Link>
        </Button>
      </div>
    );
  }

  const rating = activity.externalRating || activity.rating;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/activities">
          <ArrowLeft className="h-4 w-4" />
          Alle Aktivitäten
        </Link>
      </Button>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden"
      >
        <img
          src={activity.imageUrl}
          alt={activity.title}
          className="w-full h-[300px] md:h-[400px] object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge className={cn(CategoryColors[activity.category])}>
              {CategoryLabels[activity.category]}
            </Badge>
            <Badge variant="secondary" className={cn(RiskLevelColors[activity.riskLevel])}>
              Risiko: {RiskLevelLabels[activity.riskLevel]}
            </Badge>
            <Badge variant="outline">
              {SeasonLabels[activity.season]}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold mb-2">{activity.title}</h1>
          <p className="text-muted-foreground text-lg">{activity.shortDescription}</p>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {activity.longDescription && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-card/60 border-border/50 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Beschreibung</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {activity.longDescription}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Scales */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-card/60 border-border/50 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Aktivitätsprofil</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {activity.physicalIntensity !== undefined && (
                  <ScaleBar
                    label="Körperliche Intensität"
                    value={activity.physicalIntensity}
                    max={5}
                  />
                )}
                {activity.mentalChallenge !== undefined && (
                  <ScaleBar
                    label="Mentale Herausforderung"
                    value={activity.mentalChallenge}
                    max={5}
                  />
                )}
                {activity.socialInteractionLevel !== undefined && (
                  <ScaleBar
                    label="Soziale Interaktion"
                    value={activity.socialInteractionLevel}
                    max={5}
                  />
                )}
                {activity.competitionLevel !== undefined && (
                  <ScaleBar
                    label="Wettbewerbslevel"
                    value={activity.competitionLevel}
                    max={5}
                  />
                )}
                {activity.teamworkLevel !== undefined && (
                  <ScaleBar
                    label="Teamwork"
                    value={activity.teamworkLevel}
                    max={5}
                  />
                )}
                {activity.creativityLevel !== undefined && (
                  <ScaleBar
                    label="Kreativität"
                    value={activity.creativityLevel}
                    max={5}
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Tags */}
          {activity.tags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-card/60 border-border/50 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {activity.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="rounded-full">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.0 }}
          >
            <Button 
              className={cn(
                "w-full rounded-xl h-12 text-base gap-2",
                isFav && "bg-destructive hover:bg-destructive/90"
              )}
              onClick={handleFavoriteToggle}
            >
              <Heart className={cn("h-5 w-5", isFav && "fill-current")} />
              {isFav ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
              <span className="text-xs text-muted-foreground ml-auto">
                {favoriteCount} Favoriten
              </span>
            </Button>
          </motion.div>

          {/* Quick Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-card/60 border-primary/30 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Auf einen Blick</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Price */}
                <div className="flex items-start gap-3">
                  <Euro className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold">ab {activity.estPricePerPerson}€ p.P.</p>
                    {activity.priceComment && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.priceComment}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Duration */}
                {(activity.typicalDurationHours || activity.duration) && (
                  <>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">
                          {activity.typicalDurationHours 
                            ? `ca. ${activity.typicalDurationHours} Stunden`
                            : activity.duration
                          }
                        </p>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Group Size */}
                {(activity.recommendedGroupSizeMin || activity.recommendedGroupSizeMax) && (
                  <>
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">
                          {activity.recommendedGroupSizeMin}–{activity.recommendedGroupSizeMax} Personen
                        </p>
                        {activity.minParticipants && (
                          <p className="text-xs text-muted-foreground">
                            Min. {activity.minParticipants} Teilnehmer
                          </p>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Rating */}
                {rating && (
                  <>
                    <div className="flex items-center gap-3">
                      <Star className="h-5 w-5 text-warning fill-warning" />
                      <p className="font-medium">{rating.toFixed(1)} / 5.0</p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Primary Goal */}
                {activity.primaryGoal && (
                  <>
                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-primary" />
                      <p className="font-medium">{PrimaryGoalLabels[activity.primaryGoal]}</p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Weather Dependent */}
                {activity.weatherDependent !== undefined && (
                  <div className="flex items-center gap-3">
                    <CloudSun className="h-5 w-5 text-primary" />
                    <p className="font-medium">
                      {activity.weatherDependent ? "Wetterabhängig" : "Wetterunabhängig"}
                    </p>
                  </div>
                )}

                {/* Accessibility */}
                {activity.accessibilityFlags && activity.accessibilityFlags.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <Accessibility className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {activity.accessibilityFlags.map((flag) => (
                          <Badge key={flag} variant="outline" className="text-xs">
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Location & Contact */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-card/60 border-border/50 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Standort & Kontakt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Location */}
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">{activity.locationCity || RegionLabels[activity.locationRegion]}</p>
                    {activity.locationAddress && (
                      <p className="text-sm text-muted-foreground">{activity.locationAddress}</p>
                    )}
                  </div>
                </div>

                {/* Travel Time */}
                {(activity.travelTimeMinutes || activity.travelTimeMinutesWalking) && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      {activity.travelTimeMinutes && (
                        <div className="flex items-center gap-3 text-sm">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <span>ca. {activity.travelTimeMinutes} Min. mit Auto</span>
                        </div>
                      )}
                      {activity.travelTimeMinutesWalking && (
                        <div className="flex items-center gap-3 text-sm">
                          <FootprintsIcon className="h-4 w-4 text-muted-foreground" />
                          <span>ca. {activity.travelTimeMinutesWalking} Min. zu Fuß</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Lead Time */}
                {activity.leadTimeMinDays && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-primary" />
                      <p className="text-sm">
                        Mind. {activity.leadTimeMinDays} Tage Vorlauf
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                {/* Provider */}
                {activity.provider && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Anbieter</p>
                    <p className="font-medium">{activity.provider}</p>
                  </div>
                )}

                {/* Contact Links */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {activity.website && (
                    <Button asChild variant="secondary" size="sm" className="gap-2 rounded-xl">
                      <a href={activity.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4" />
                        Website
                      </a>
                    </Button>
                  )}
                  {activity.contactPhone && (
                    <Button asChild variant="secondary" size="sm" className="gap-2 rounded-xl">
                      <a href={`tel:${activity.contactPhone}`}>
                        <Phone className="h-4 w-4" />
                        Anrufen
                      </a>
                    </Button>
                  )}
                  {activity.contactEmail && (
                    <Button asChild variant="secondary" size="sm" className="gap-2 rounded-xl">
                      <a href={`mailto:${activity.contactEmail}`}>
                        <Mail className="h-4 w-4" />
                        E-Mail
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
