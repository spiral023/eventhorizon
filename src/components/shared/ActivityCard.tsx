import { MapPin, Euro, Clock, Users, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Activity } from "@/types/domain";
import { CategoryLabels, RegionLabels, CategoryColors } from "@/types/domain";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ActivityCardProps {
  activity: Activity;
  onClick?: () => void;
}

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden",
        "bg-card/60 hover:bg-card/80 border-border/50 hover:border-primary/30",
        "transition-all duration-300 hover:shadow-xl hover:shadow-primary/5",
        "rounded-2xl hover:-translate-y-1"
      )}
      onClick={onClick}
    >
      {/* Image Section */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={activity.imageUrl}
          alt={activity.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
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
            "bg-card/80 backdrop-blur-sm hover:bg-card",
            isFavorite && "text-destructive"
          )}
          onClick={handleFavoriteClick}
        >
          <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
        </Button>
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
            <span>{RegionLabels[activity.locationRegion]}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Euro className="h-3.5 w-3.5" />
            <span>ab {activity.estPricePerPerson}€</span>
          </div>
          {activity.duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{activity.duration}</span>
            </div>
          )}
          {activity.groupSizeMin && activity.groupSizeMax && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>{activity.groupSizeMin}-{activity.groupSizeMax}</span>
            </div>
          )}
        </div>

        {/* Tags */}
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
      </CardContent>
    </Card>
  );
}
