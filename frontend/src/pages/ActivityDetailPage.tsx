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
  BookOpen,
  Target,
  Accessibility,
  CloudSun
  ,
  Facebook,
  Instagram,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader";
import { ScaleBar } from "@/components/shared/ScaleBar";
import { ActivityMiniMap } from "@/components/shared/ActivityMiniMap";
import { getActivityById, isFavorite, toggleFavorite, getActivityComments, createActivityComment, deleteActivityComment } from "@/services/apiClient";
import type { Activity, ActivityComment } from "@/types/domain";
import {
  CategoryLabels,
  CategoryColors,
  RegionLabels,
  SeasonLabels
} from "@/types/domain";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { BookingRequestDialog } from "@/components/activities/BookingRequestDialog";

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
  
  const { user, isAuthenticated } = useAuthStore();
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!activityId) return;
      const [activityResult, favResult, commentsResult] = await Promise.all([
        getActivityById(activityId),
        isAuthenticated
          ? isFavorite(activityId)
          : Promise.resolve({ data: { isFavorite: false, favoritesCount: 0 } }),
        getActivityComments(activityId)
      ]);
      setActivity(activityResult.data);

      const favoritesData = favResult.data || { isFavorite: false, favoritesCount: activityResult.data?.favoritesCount ?? 0 };
      setIsFav(favoritesData.isFavorite ?? false);
      setFavoriteCount(
        favoritesData.favoritesCount ?? activityResult.data?.favoritesCount ?? 0
      );
      setComments(commentsResult.data || []);
      setLoading(false);
    };
    fetchActivity();
  }, [activityId, isAuthenticated]);

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      toast.error("Bitte anmelden oder registrieren, um Favoriten zu speichern.");
      return;
    }
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

  const handleSubmitComment = async () => {
    if (!activityId || !newComment.trim()) return;
    setSubmittingComment(true);
    const result = await createActivityComment(activityId, newComment);
    if (result.error) {
      toast.error(result.error.message || "Kommentar konnte nicht gesendet werden");
    } else if (result.data) {
      setComments([result.data, ...comments]);
      setNewComment("");
      toast.success("Kommentar gesendet");
    }
    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!activityId) return;
    const confirmDelete = window.confirm("Diesen Kommentar löschen?");
    if (!confirmDelete) return;

    const result = await deleteActivityComment(activityId, commentId);
    if (result.error) {
      toast.error(result.error.message || "Kommentar konnte nicht gelöscht werden");
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    toast.success("Kommentar gelöscht");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary/60 dark:bg-secondary/40 rounded animate-pulse" />
        <div className="h-[400px] bg-secondary/40 dark:bg-secondary/30 rounded-2xl animate-pulse" />
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
        {/* Enhanced gradient overlay for better text readability in both light and dark mode */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10 dark:from-background dark:via-background/80 dark:to-background/30" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge className={cn(CategoryColors[activity.category], "shadow-lg")}>
              {CategoryLabels[activity.category]}
            </Badge>
            <Badge variant="outline" className="bg-black/50 dark:bg-white/20 text-white border-white/40 dark:border-white/50 shadow-lg backdrop-blur-sm">
              {SeasonLabels[activity.season]}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold mb-2 text-foreground drop-shadow-lg">{activity.title}</h1>
          <p className="hidden md:block text-foreground/80 dark:text-foreground/90 text-lg drop-shadow-md">{activity.shortDescription}</p>
        </div>

        {/* Hero Actions Overlay - Improved contrast for dark mode */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className="flex items-center gap-1 bg-black/30 dark:bg-white/20 backdrop-blur-md border border-white/20 dark:border-white/30 rounded-full pl-1 pr-1 h-10 hover:bg-black/40 dark:hover:bg-white/30 transition-all shadow-lg">
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-8 w-8 rounded-full text-white hover:text-white hover:bg-white/10 dark:hover:bg-white/20",
                isFav && "text-red-500 hover:text-red-400 dark:text-red-400 dark:hover:text-red-300"
              )}
              onClick={handleFavoriteToggle}
            >
              <Heart className={cn("h-5 w-5", isFav && "fill-current")} />
            </Button>
            {favoriteCount > 0 && (
              <span className="text-white dark:text-white text-sm font-medium pr-3 select-none drop-shadow-md">
                {favoriteCount}
              </span>
            )}
          </div>
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
              <Card className="bg-card/80 dark:bg-card/90 border-border/60 dark:border-border/40 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Beschreibung</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground dark:text-muted-foreground/90 leading-relaxed">
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
            <Card className="bg-card/80 dark:bg-card/90 border-border/60 dark:border-border/40 rounded-2xl">
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
              <Card className="bg-card/80 dark:bg-card/90 border-border/60 dark:border-border/40 rounded-2xl">
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

          {/* Comments Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-card/80 dark:bg-card/90 border-border/60 dark:border-border/40 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Kommentare</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Comment Input */}
                {user ? (
                  <div className="flex gap-4">
                    <Avatar className="h-10 w-10 ring-2 ring-border/50">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback>{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Textarea
                        placeholder="Schreibe einen Kommentar..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <Button
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim() || submittingComment}
                        className="ml-auto"
                      >
                        {submittingComment ? "Sende..." : "Kommentieren"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4 bg-muted/60 dark:bg-muted/40 rounded-lg">
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground/90">
                      Bitte <Link to="/login" className="text-primary hover:underline font-medium">anmelden</Link>, um zu kommentieren.
                    </p>
                  </div>
                )}

                {/* Comments List */}
                <div className="space-y-6">
                  {comments.length === 0 ? (
                    <p className="text-center text-muted-foreground dark:text-muted-foreground/90 py-8">
                      Noch keine Kommentare vorhanden. Sei der Erste!
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-4">
                         <Avatar className="h-10 w-10 ring-2 ring-border/50">
                          <AvatarImage src={comment.userAvatar} alt={comment.userName} />
                          <AvatarFallback>{comment.userName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{comment.userName}</span>
                            <span className="text-xs text-muted-foreground dark:text-muted-foreground/80">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: de })}
                            </span>
                            {comment.userId === user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-muted-foreground dark:text-muted-foreground/80 hover:text-destructive dark:hover:text-destructive"
                                onClick={() => handleDeleteComment(comment.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                Löschen
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-foreground/90 dark:text-foreground/95 leading-relaxed">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Booking Request */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <BookingRequestDialog activity={activity}>
              <Button
                variant="default"
                className="w-full rounded-xl h-12 text-base gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-600 dark:hover:to-indigo-600 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-500/40"
              >
                <Mail className="h-5 w-5" />
                Buchungsanfrage
              </Button>
            </BookingRequestDialog>
          </motion.div>

          {/* Quick Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-card/80 dark:bg-card/90 border-primary/40 dark:border-primary/30 rounded-2xl">
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
                      <p className="text-xs text-muted-foreground dark:text-muted-foreground/90 mt-1">
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
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground/90">
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
            <Card className="bg-card/80 dark:bg-card/90 border-border/60 dark:border-border/40 rounded-2xl">
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
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground/90">{activity.locationAddress}</p>
                    )}
                  </div>
                </div>
                
                <div className="rounded-lg overflow-hidden">
                  <ActivityMiniMap activity={activity} className="h-[200px] w-full" />
                </div>

                {/* Travel Time */}
                {(activity.travelTimeMinutes || activity.travelTimeMinutesWalking) && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      {activity.travelTimeMinutes && (
                        <div className="flex items-center gap-3 text-sm text-foreground/90">
                          <Car className="h-4 w-4 text-muted-foreground dark:text-muted-foreground/90" />
                          <span>ca. {activity.travelTimeMinutes} Min. mit Auto</span>
                        </div>
                      )}
                      {activity.travelTimeMinutesWalking && (
                        <div className="flex items-center gap-3 text-sm text-foreground/90">
                          <FootprintsIcon className="h-4 w-4 text-muted-foreground dark:text-muted-foreground/90" />
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

                {/* Capacity */}
                {typeof activity.maxCapacity === "number" && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-primary" />
                      <p className="text-sm">
                        Max. {activity.maxCapacity} Personen gleichzeitig
                      </p>
                    </div>
                  </>
                )}

                {/* Outdoor seating */}
                {activity.outdoorSeating !== undefined && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <CloudSun className="h-5 w-5 text-primary" />
                      <p className="text-sm">
                        {activity.outdoorSeating
                          ? "Sitzplätze im Freien verfügbar"
                          : "Keine Sitzplätze im Freien"}
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                {/* Provider */}
                {activity.provider && (
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground/90 mb-1">Anbieter</p>
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
                  {activity.reservationUrl && (
                    <Button asChild variant="secondary" size="sm" className="gap-2 rounded-xl">
                      <a href={activity.reservationUrl} target="_blank" rel="noopener noreferrer">
                        <Calendar className="h-4 w-4" />
                        Reservierung
                      </a>
                    </Button>
                  )}
                  {activity.menuUrl && (
                    <Button asChild variant="secondary" size="sm" className="gap-2 rounded-xl">
                      <a href={activity.menuUrl} target="_blank" rel="noopener noreferrer">
                        <BookOpen className="h-4 w-4" />
                        Speisekarte
                      </a>
                    </Button>
                  )}
                  {activity.facebook && (
                    <Button asChild variant="secondary" size="sm" className="gap-2 rounded-xl">
                      <a href={activity.facebook} target="_blank" rel="noopener noreferrer">
                        <Facebook className="h-4 w-4" />
                        Facebook
                      </a>
                    </Button>
                  )}
                  {activity.instagram && (
                    <Button asChild variant="secondary" size="sm" className="gap-2 rounded-xl">
                      <a href={activity.instagram} target="_blank" rel="noopener noreferrer">
                        <Instagram className="h-4 w-4" />
                        Instagram
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
