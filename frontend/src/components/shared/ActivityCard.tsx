import { MapPin, Euro, Clock, Users, Heart, Star, Zap, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScaleBar } from "@/components/shared/ScaleBar";
import type { Activity } from "@/types/domain";
import { CategoryLabels, RegionLabels, CategoryColors } from "@/types/domain";
import { cn } from "@/lib/utils";

interface ActivityCardProps {
  activity: Activity;
  isFavorite?: boolean;
  onFavoriteToggle?: (activityId: string) => void;
  onClick?: () => void;
  showDetails?: boolean;
  showTags?: boolean;
}

export function ActivityCard({ 
  activity, 
  isFavorite = false,
  onFavoriteToggle,
  onClick,
  showDetails = false,
  showTags = true
}: ActivityCardProps) {
  const formatDuration = () => {
    if (activity.duration) return activity.duration;
    if (typeof activity.typicalDurationHours === "number") {
      const hours = activity.typicalDurationHours;
      const formatted = hours % 1 === 0
        ? hours.toString()
        : hours.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      return `${formatted}h`;
    }
    return "-";
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.(activity.id);
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden will-change-[transform,opacity]",
        "bg-card/60 hover:bg-card/80 border-border/50 hover:border-primary/30",
        "transition duration-300 ease-fluid hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1",
        "rounded-2xl motion-reduce:transform-none motion-reduce:hover:shadow-none"
      )}
      onClick={onClick}
    >
      {/* Image Section */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={activity.imageUrl}
          alt={activity.title}
          className="h-full w-full object-cover transition-transform duration-500 ease-fluid group-hover:scale-110 will-change-transform motion-reduce:transform-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        
        {/* Category Badge */}
        <Badge
          className={cn(
            "absolute top-3 left-3 rounded-lg font-medium",
            CategoryColors[activity.category]
          )}
        >
          {CategoryLabels[activity.category]}
        </Badge>

        {/* Favorite Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-3 right-3 h-9 w-9 rounded-full",
            "bg-card/80 backdrop-blur-sm hover:bg-card hover:text-foreground",
            isFavorite && "text-destructive hover:text-destructive"
          )}
          onClick={handleFavoriteClick}
        >
          <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
        </Button>

        {/* Rating */}
        {activity.rating && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-card/80 backdrop-blur-sm">
            <Star className="h-3.5 w-3.5 text-warning fill-warning" />
            <span className="text-sm font-medium">{activity.rating}</span>
            {activity.reviewCount && (
              <span className="text-xs text-muted-foreground">({activity.reviewCount})</span>
            )}
          </div>
        )}
      </div>

      {/* Content Section */}
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
          {activity.title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {activity.shortDescription}
        </p>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span>{activity.locationCity || RegionLabels[activity.locationRegion]}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Euro className="h-3.5 w-3.5" />
            <span>ab {activity.estPricePerPerson}€</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDuration()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>{activity.groupSizeMin}-{activity.groupSizeMax}</span>
          </div>
        </div>

        {/* Scales (shown on detail view) */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
            <ScaleBar 
              value={activity.physicalIntensity} 
              label="Körperlich" 
              size="sm"
              colorClass="bg-destructive"
            />
            <ScaleBar 
              value={activity.mentalChallenge} 
              label="Mental" 
              size="sm"
              colorClass="bg-purple-500"
            />
            <ScaleBar 
              value={activity.teamworkLevel} 
              label="Teamwork" 
              size="sm"
              colorClass="bg-primary"
            />
          </div>
        )}

        {/* Quick Stats Icons */}
        {!showDetails && (
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1" title="Koerperliche Intensitaet">
              <Zap className={cn(
                "h-4 w-4",
                activity.physicalIntensity >= 4 ? "text-destructive" : 
                activity.physicalIntensity >= 2 ? "text-warning" : "text-muted-foreground"
              )} />
              <span className="text-xs">{activity.physicalIntensity}/5</span>
            </div>
            <div className="flex items-center gap-1" title="Mentale Herausforderung">
              <Brain className={cn(
                "h-4 w-4",
                activity.mentalChallenge >= 4 ? "text-purple-500" : "text-muted-foreground"
              )} />
              <span className="text-xs">{activity.mentalChallenge}/5</span>
            </div>
            <div className="flex items-center gap-1" title="Soziale Interaktion">
              <Users className={cn(
                "h-4 w-4",
                activity.socialInteractionLevel >= 4 ? "text-primary" : "text-muted-foreground"
              )} />
              <span className="text-xs">{activity.socialInteractionLevel ?? "-"}/5</span>
            </div>
            <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
              <div className="flex items-center gap-1" title="Favoriten">
                <Heart className={cn("h-4 w-4", (activity.favoritesCount ?? 0) > 0 && "text-destructive")} />
                <span>{activity.favoritesCount ?? 0}</span>
              </div>
              <div className="flex items-center gap-1" title="Externes Rating">
                <Star className="h-4 w-4 text-warning fill-warning" />
                <span>{activity.externalRating !== undefined ? activity.externalRating.toFixed(1) : "–"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        {showTags && activity.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {activity.tags.slice(0, 3).map((tag) => (
              <Badge 
                key={tag} 
                variant="secondary" 
                className="rounded-md text-xs font-normal px-2 py-0.5"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
