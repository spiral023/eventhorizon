import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  Sparkles,
  Car,
  FootprintsIcon,
  Calendar,
  BookOpen,
  Target,
  Accessibility,
  CloudSun,
  Facebook,
  Instagram,
  Trash2,
  MessageCircle,
  Send,
  Loader2,
  Share2,
  ArrowRight,
  AlertTriangle,
  ThumbsUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { activitiesQueryKey, useActivities } from "@/hooks/use-activities";
import { favoriteActivityIdsQueryKey } from "@/hooks/use-favorite-activity-ids";
import { useAuthStore } from "@/stores/authStore";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { BookingRequestDialog } from "@/components/activities/BookingRequestDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const EMPTY_ACTIVITIES: Activity[] = [];
const EMPTY_IDS: string[] = [];

const PrimaryGoalLabels: Record<string, string> = {
  teambuilding: "Teambuilding",
  fun: "Spaß & Unterhaltung",
  reward: "Belohnung & Genuss",
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

// Helper component for detail rows
function DetailRow({
  icon: Icon,
  label,
  value
}: {
  icon: React.ElementType;
  label: string;
  value: string | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="h-4 w-4 text-primary flex-shrink-0" />
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium ml-auto">{value}</span>
    </div>
  );
}

// Enhanced scale row component
function ScaleRow({
  icon: Icon,
  iconColor,
  label,
  value,
  max = 5,
  gradientFrom,
  gradientTo,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  value: number;
  max?: number;
  gradientFrom: string;
  gradientTo: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", iconColor.replace("text-", "bg-").replace("-500", "-100"), "dark:" + iconColor.replace("text-", "bg-").replace("-500", "-950/30"))}>
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm font-semibold text-muted-foreground">
          {value}/{max}
        </span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(value / max) * 100}%` }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className={cn("h-full rounded-full bg-gradient-to-r", gradientFrom, gradientTo)}
        />
      </div>
    </div>
  );
}

// Force HMR update
export default function ActivityDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const { data: activitiesData } = useActivities();
  const resolvedActivities = activitiesData ?? EMPTY_ACTIVITIES;

  const { user, isAuthenticated } = useAuthStore();
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

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
    setAllActivities(resolvedActivities);
  }, [resolvedActivities]);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!slug) return;
      const [activityResult, favResult, commentsResult] = await Promise.all([
        getActivityById(slug),
        isAuthenticated
          ? isFavorite(slug)
          : Promise.resolve({ data: { isFavorite: false, favoritesCount: 0 } }),
        getActivityComments(slug)
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
  }, [slug, isAuthenticated]);

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      toast.error("Bitte anmelden oder registrieren, um Favoriten zu speichern.");
      return;
    }
    if (!slug) return;
    const result = await toggleFavorite(slug);
    if (result.error) {
      toast.error(result.error.message || "Favorit konnte nicht aktualisiert werden");
      return;
    }
    const isFavorite = result.data?.isFavorite ?? false;
    const count = result.data?.favoritesCount ?? favoriteCount;
    const activityId = activity?.id ?? slug;
    updateFavoriteCaches(activityId, isFavorite, count);
    setIsFav(isFavorite);
    setFavoriteCount(count);
    setActivity((prev) => (prev ? { ...prev, favoritesCount: count } : prev));
    setAllActivities((prev) =>
      prev.map((item) =>
        item.id === activity?.id ? { ...item, favoritesCount: count } : item
      )
    );
    if (window.innerWidth >= 768) {
      toast.success(isFavorite ? "Zu Favoriten hinzugefügt" : "Aus Favoriten entfernt");
    }
  };

  const handleShare = async () => {
    if (!activity) return;
    const shareData = {
      title: activity.title,
      text: activity.shortDescription,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link kopiert!");
      }
    } catch (err) {
      // Ignore abort errors
      if ((err as Error).name !== 'AbortError') {
        console.error("Error sharing:", err);
      }
    }
  };

  const handleSubmitComment = async () => {
    if (!slug || !newComment.trim()) return;
    setSubmittingComment(true);
    const result = await createActivityComment(slug, newComment);
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
    if (!slug) return;
    const confirmDelete = window.confirm("Diesen Kommentar löschen?");
    if (!confirmDelete) return;

    const result = await deleteActivityComment(slug, commentId);
    if (result.error) {
      toast.error(result.error.message || "Kommentar konnte nicht gelöscht werden");
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    toast.success("Kommentar gelöscht");
  };

  const sortedActivities = useMemo(() => {
    return [...allActivities].sort(
      (a, b) => (b.favoritesCount || 0) - (a.favoritesCount || 0)
    );
  }, [allActivities]);
  const nextActivity = useMemo(() => {
    if (!activity || sortedActivities.length === 0) return null;
    const currentIndex = sortedActivities.findIndex((item) => item.id === activity.id);
    if (currentIndex < 0 || currentIndex >= sortedActivities.length - 1) return null;
    return sortedActivities[currentIndex + 1];
  }, [activity, sortedActivities]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-32 bg-secondary/60 rounded-lg" />
        <div className="h-[400px] bg-secondary/40 rounded-2xl" />
        <div className="h-24 bg-secondary/30 rounded-2xl -mt-12 mx-4" />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 bg-secondary/30 rounded-2xl" />
            <div className="h-64 bg-secondary/30 rounded-2xl" />
          </div>
          <div className="space-y-6">
            <div className="h-48 bg-secondary/30 rounded-2xl" />
            <div className="h-64 bg-secondary/30 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Target className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Aktivität nicht gefunden</h1>
        <p className="text-muted-foreground mb-6">Die gesuchte Aktivität existiert nicht oder wurde entfernt.</p>
        <Button asChild variant="default" className="rounded-xl">
          <Link to="/activities">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Alle Aktivitäten
          </Link>
        </Button>
      </div>
    );
  }

  const rating = activity.externalRating || activity.rating;


  return (
    <div className="pb-32 md:pb-8">
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6 flex items-center gap-2"
      >
        <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
          <Link to="/activities">
            <ArrowLeft className="h-4 w-4" />
            Alle Aktivitäten
          </Link>
        </Button>
        {nextActivity?.slug && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-2 ml-auto text-muted-foreground hover:text-foreground"
          >
            <Link to={`/activities/${nextActivity.slug}`}>
              Nächste Aktivität
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </motion.div>

      {/* Main Content Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mt-6 grid gap-8 lg:grid-cols-4 lg:gap-10"
      >
        {/* Primary Content Column */}
        <div className="lg:col-span-3 space-y-8">

          <div>
          {/* Hero Section - Enhanced */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative -mx-4 sm:-mx-6 lg:mx-0 lg:rounded-2xl overflow-hidden"
          >
            {/* Hero Image Container */}
            <div className="relative h-[320px] sm:h-[380px] md:h-[420px] lg:h-[480px]">
              <img
                src={activity.imageUrl}
                alt={activity.title}
                className="w-full h-full object-cover"
              />

              {/* Layered gradients for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

              {/* Hero Content */}
              <div className="absolute bottom-0 left-0 right-0 px-4 pt-16 pb-16 sm:px-6 sm:pt-20 sm:pb-20 lg:px-8 lg:pt-24 lg:pb-24 flex flex-col justify-center">
                <div className="max-w-4xl">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Badge
                      className={cn(
                        CategoryColors[activity.category],
                        "text-sm px-3 py-1"
                      )}
                    >
                      {CategoryLabels[activity.category]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-white/15 backdrop-blur-md text-white border-white/30 text-sm px-3 py-1"
                    >
                      {SeasonLabels[activity.season]}
                    </Badge>
                    {rating && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "bg-white/15 backdrop-blur-md border-white/30 text-sm px-3 py-1",
                          rating < 4.0 ? "text-red-400 font-bold" : "text-white"
                        )}
                      >
                        <Star className="h-3.5 w-3.5 fill-warning text-warning mr-1" />
                        {rating.toFixed(1)}
                      </Badge>
                    )}
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">
                    {activity.title}
                  </h1>
                </div>
              </div>

              {/* Top-Right Actions (Mobile & Desktop) */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                 <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-full backdrop-blur-md bg-white/20 text-white border border-white/10 cursor-help" title="Gesamte Dafür-Stimmen aus Events">
                   <ThumbsUp className={cn("h-5 w-5", (activity.totalUpvotes ?? 0) > 0 && "text-green-400")} />
                   <span className="font-medium text-sm">{activity.totalUpvotes ?? 0}</span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleShare}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-full backdrop-blur-md bg-white/20 text-white hover:bg-white/30 transition-all border border-white/10"
                  title="Aktivität teilen"
                >
                  <Share2 className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium text-sm">Teilen</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleFavoriteToggle}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-full backdrop-blur-md transition-all border border-white/10",
                    isFav
                      ? "bg-red-500/90 text-white border-red-500/20"
                      : "bg-white/20 text-white hover:bg-white/30"
                  )}
                  title={isFav ? "Von Favoriten entfernen" : "Zu Favoriten hinzufügen"}
                >
                  <Heart className={cn("h-5 w-5", isFav && "fill-current")} />
                  {favoriteCount > 0 && <span className="font-medium text-sm">{favoriteCount}</span>}
                </motion.button>
              </div>
            </div>
          </motion.section>

          {/* Quick Stats Bar - Floating */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="relative z-10 -mt-12 mx-2 sm:mx-4 lg:mx-0"
          >
            <Card className="bg-card/95 backdrop-blur-sm border-border/50 shadow-xl rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border/50">
                  {/* Price */}
                  <div className="p-3 sm:p-4 md:p-6 text-center">
                    <div className="flex items-center justify-center text-primary mb-1">
                      <Euro className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold">
                      ab {activity.estPricePerPerson ?? 0}€
                    </p>
                    <p className="text-xs text-muted-foreground">pro Person</p>
                  </div>

                  {/* Duration */}
                  <div className="p-3 sm:p-4 md:p-6 text-center">
                    <div className="flex items-center justify-center text-primary mb-1">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold">
                      {activity.typicalDurationHours ? `${activity.typicalDurationHours}h` : "Flexibel"}
                    </p>
                    <p className="text-xs text-muted-foreground">Dauer</p>
                  </div>

                  {/* Group Size */}
                  <div className="p-3 sm:p-4 md:p-6 text-center">
                    <div className="flex items-center justify-center text-primary mb-1">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold">
                      {activity.recommendedGroupSizeMin || 2}-{activity.recommendedGroupSizeMax || 20}
                    </p>
                    <p className="text-xs text-muted-foreground">Personen</p>
                  </div>

                  {/* Location */}
                  <div className="p-3 sm:p-4 md:p-6 text-center">
                    <div className="flex items-center justify-center text-primary mb-1">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">
                      {activity.locationCity || RegionLabels[activity.locationRegion]}
                    </p>
                    <p className="text-xs text-muted-foreground">Standort</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          </div>

          {/* Description Section */}
          {activity.longDescription && (
            <motion.section variants={itemVariants}>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Über diese Aktivität</h2>
              </div>
              <p className="text-muted-foreground leading-7">
                {activity.longDescription}
              </p>
            </motion.section>
          )}

          {/* Customer Voice Section */}
          {activity.customerVoice && (
            <motion.section variants={itemVariants}>
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Die Kunden sagen</h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition"
                      aria-label="Info zur KI-Zusammenfassung"
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs leading-5">
                    KI-generierte Zusammenfassung; kann fehlerhaft oder unvollständig sein und spiegelt nicht alle Bewertungen wider.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Card className="bg-muted/30 border-border/50 rounded-2xl">
                <CardContent className="p-6 italic text-muted-foreground leading-7 relative">
                   <span className="absolute top-4 left-4 text-4xl text-primary/20 font-serif leading-none">“</span>
                   <span className="relative z-10">{activity.customerVoice}</span>
                   <span className="absolute bottom-2 right-4 text-4xl text-primary/20 font-serif leading-none rotate-180">“</span>
                </CardContent>
              </Card>
            </motion.section>
          )}

          {/* Tags */}
          {activity.tags.length > 0 && (
            <motion.section variants={itemVariants}>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Schlagwörter
              </p>
              <div className="flex flex-wrap gap-2">
                {activity.tags
                  .filter(tag => tag.toLowerCase() !== "kultur" && tag.toLowerCase() !== "culture")
                  .map((tag) => (
                  <Link key={tag} to={`/activities?q=${encodeURIComponent(tag)}`}>
                    <Badge
                      variant="secondary"
                      className="rounded-full px-4 py-1.5 text-sm font-normal hover:bg-secondary/80 transition"
                    >
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            </motion.section>
          )}

          {/* Comments Section */}
          <motion.section variants={itemVariants}>
            <Card className="border-border/50 rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Kommentare
                  {comments.length > 0 && (
                    <Badge variant="secondary" className="ml-2 rounded-full text-xs">
                      {comments.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Comment Input */}
                {user ? (
                  <div className="flex gap-3 sm:gap-4">
                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10 ring-2 ring-primary/20 flex-shrink-0">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                      <Textarea
                        placeholder="Teile deine Erfahrung oder stelle eine Frage..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[100px] resize-none rounded-xl border-border/50 focus:border-primary/50"
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleSubmitComment}
                          disabled={!newComment.trim() || submittingComment}
                          className="rounded-xl gap-2"
                        >
                          {submittingComment ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Sende...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Kommentieren
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 px-4 bg-muted/30 rounded-xl border border-dashed border-border/50">
                    <p className="text-sm text-muted-foreground">
                      <Link to="/login" className="text-primary hover:underline font-medium">
                        Anmelden
                      </Link>
                      {" "}um einen Kommentar zu schreiben
                    </p>
                  </div>
                )}

                {/* Separator */}
                {user && comments.length > 0 && <Separator />}

                {/* Comments List */}
                <div className="space-y-5">
                  {comments.length === 0 ? (
                    <div className="text-center py-10">
                      <MessageCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">Noch keine Kommentare vorhanden.</p>
                      <p className="text-sm text-muted-foreground/70">Sei der Erste!</p>
                    </div>
                  ) : (
                    comments.map((comment, index) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex gap-3 sm:gap-4 group"
                      >
                        <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
                          <AvatarImage src={comment.userAvatar} alt={comment.userName} />
                          <AvatarFallback>{comment.userName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-sm">{comment.userName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: de })}
                            </span>
                            {comment.userId === user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeleteComment(comment.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-foreground/90 leading-relaxed">
                            {comment.content}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-6 self-start">

          {/* Primary CTA - Desktop */}
          <motion.div variants={itemVariants} className="hidden md:block">
            <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 rounded-2xl overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-0.5">Interesse geweckt?</p>
                  <p className="font-semibold">Jetzt unverbindlich anfragen</p>
                </div>
                <BookingRequestDialog activity={activity}>
                  <Button
                    size="lg"
                    className="w-full h-12 rounded-xl font-semibold gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5"
                  >
                    <Mail className="h-5 w-5" />
                    Buchungsanfrage
                  </Button>
                </BookingRequestDialog>

                {/* Favorite Button */}
                <Button
                  variant="outline"
                  size="lg"
                  className={cn(
                    "w-full h-11 rounded-xl gap-2 transition-all duration-300",
                    isFav && "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400"
                  )}
                  onClick={handleFavoriteToggle}
                >
                  <Heart className={cn("h-5 w-5 transition-transform", isFav && "fill-current scale-110")} />
                  {isFav ? "Gespeichert" : "Merken"}
                  {favoriteCount > 0 && (
                    <span className="ml-1 text-muted-foreground">({favoriteCount})</span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>



          {/* Activity Profile Card */}
          <motion.div variants={itemVariants}>
            <Card className="border-border/50 rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Profil
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid gap-4">
                  {activity.physicalIntensity !== undefined && (
                    <ScaleRow
                      icon={Zap}
                      iconColor="text-orange-500"
                      label="Körperlich"
                      value={activity.physicalIntensity}
                      gradientFrom="from-orange-400"
                      gradientTo="to-orange-500"
                    />
                  )}
                  {activity.mentalChallenge !== undefined && (
                    <ScaleRow
                      icon={Brain}
                      iconColor="text-purple-500"
                      label="Mental"
                      value={activity.mentalChallenge}
                      gradientFrom="from-purple-400"
                      gradientTo="to-purple-500"
                    />
                  )}
                  {activity.socialInteractionLevel !== undefined && (
                    <ScaleRow
                      icon={Users}
                      iconColor="text-blue-500"
                      label="Sozial"
                      value={activity.socialInteractionLevel}
                      gradientFrom="from-blue-400"
                      gradientTo="to-blue-500"
                    />
                  )}
                  {activity.competitionLevel !== undefined && (
                    <ScaleRow
                      icon={Target}
                      iconColor="text-red-500"
                      label="Wettbewerb"
                      value={activity.competitionLevel}
                      gradientFrom="from-red-400"
                      gradientTo="to-red-500"
                    />
                  )}
                  {activity.teamworkLevel !== undefined && (
                    <ScaleRow
                      icon={Heart}
                      iconColor="text-pink-500"
                      label="Teamwork"
                      value={activity.teamworkLevel}
                      gradientFrom="from-pink-400"
                      gradientTo="to-pink-500"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Additional Details Card */}
          <motion.div variants={itemVariants}>
            <Card className="border-border/50 rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Weitere Details</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border/50">
                {activity.primaryGoal && (
                  <DetailRow icon={Target} label="Hauptziel" value={PrimaryGoalLabels[activity.primaryGoal]} />
                )}
                {activity.weatherDependent !== undefined && (
                  <DetailRow
                    icon={CloudSun}
                    label="Wetter"
                    value={activity.weatherDependent ? "Wetterabhängig" : "Wetterunabhängig"}
                  />
                )}
                {activity.leadTimeMinDays && (
                  <DetailRow icon={Calendar} label="Vorlauf" value={`Mind. ${activity.leadTimeMinDays} Tage`} />
                )}
                {activity.maxCapacity && (
                  <DetailRow icon={Users} label="Max. Kapazität" value={`${activity.maxCapacity} Personen`} />
                )}
                {activity.accessibilityFlags && activity.accessibilityFlags.length > 0 && (
                  <div className="py-2">
                    <div className="flex items-center gap-3 mb-2">
                      <Accessibility className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">Barrierefreiheit</span>
                    </div>
                    <div className="flex flex-wrap gap-1 ml-7">
                      {activity.accessibilityFlags.map((flag) => (
                        <Badge key={flag} variant="outline" className="text-xs">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>



          {/* Contact Card */}
          <motion.div variants={itemVariants}>
            <Card className="border-border/50 rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Kontakt & Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activity.provider && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Anbieter</p>
                    <p className="font-medium">{activity.provider}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {activity.website && (
                    <Button asChild variant="outline" size="sm" className="gap-2 rounded-xl justify-start h-9">
                      <a href={activity.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4" />
                        Website
                      </a>
                    </Button>
                  )}
                  {activity.contactPhone && (
                    <Button asChild variant="outline" size="sm" className="gap-2 rounded-xl justify-start h-9">
                      <a href={`tel:${activity.contactPhone}`}>
                        <Phone className="h-4 w-4" />
                        Anrufen
                      </a>
                    </Button>
                  )}
                  {activity.contactEmail && (
                    <Button asChild variant="outline" size="sm" className="gap-2 rounded-xl justify-start h-9">
                      <a href={`mailto:${activity.contactEmail}`}>
                        <Mail className="h-4 w-4" />
                        E-Mail
                      </a>
                    </Button>
                  )}
                  {activity.reservationUrl && (
                    <Button asChild variant="outline" size="sm" className="gap-2 rounded-xl justify-start h-9">
                      <a href={activity.reservationUrl} target="_blank" rel="noopener noreferrer">
                        <Calendar className="h-4 w-4" />
                        Reservieren
                      </a>
                    </Button>
                  )}
                  {activity.instagram && (
                    <Button asChild variant="outline" size="sm" className="gap-2 rounded-xl justify-start h-9">
                      <a href={activity.instagram} target="_blank" rel="noopener noreferrer">
                        <Instagram className="h-4 w-4" />
                        Instagram
                      </a>
                    </Button>
                  )}
                  {activity.facebook && (
                    <Button asChild variant="outline" size="sm" className="gap-2 rounded-xl justify-start h-9">
                      <a href={activity.facebook} target="_blank" rel="noopener noreferrer">
                        <Facebook className="h-4 w-4" />
                        Facebook
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Location Card */}
          <motion.div variants={itemVariants}>
            <Card className="border-border/50 rounded-2xl overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Standort
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[200px] sm:h-[220px] w-full">
                  <ActivityMiniMap activity={activity} className="h-full w-full rounded-none" />
                </div>

                <div className="p-4 space-y-3 border-t border-border/50">
                  <div>
                    <p className="font-medium">{activity.locationCity || RegionLabels[activity.locationRegion]}</p>
                    {activity.locationAddress && (
                      <p className="text-sm text-muted-foreground">{activity.locationAddress}</p>
                    )}
                  </div>

                  {(activity.travelTimeMinutes || activity.travelTimeMinutesWalking) && (
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {activity.travelTimeMinutes && (
                        <span className="flex items-center gap-1.5">
                          <Car className="h-4 w-4" />
                          {activity.travelTimeMinutes} Min.
                        </span>
                      )}
                      {activity.travelTimeMinutesWalking && (
                        <span className="flex items-center gap-1.5">
                          <FootprintsIcon className="h-4 w-4" />
                          {activity.travelTimeMinutesWalking} Min.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>


        </aside>
      </motion.div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[1002]">
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
          className="bg-background/95 backdrop-blur-xl border-t border-border shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.4)]"
        >
          <div className="px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {/* Price and favorite row */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs text-muted-foreground">Ab </span>
                <span className="text-xl font-bold">
                  {activity.estPricePerPerson ?? 0}€
                </span>
                <span className="text-sm text-muted-foreground"> / Person</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleFavoriteToggle}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full transition-all",
                  isFav
                    ? "bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Heart className={cn("h-5 w-5", isFav && "fill-current")} />
                {favoriteCount > 0 && <span className="text-sm font-medium">{favoriteCount}</span>}
              </motion.button>
            </div>

            {/* CTA Button */}
            <BookingRequestDialog activity={activity}>
              <Button
                size="lg"
                className="w-full h-12 rounded-xl font-semibold gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20"
              >
                <Mail className="h-5 w-5" />
                Buchungsanfrage senden
              </Button>
            </BookingRequestDialog>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
