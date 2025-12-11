import { Calendar, MapPin, Users, Euro, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Event } from "@/types/domain";
import { PhaseLabels, RegionLabels, formatTimeWindow, formatBudget } from "@/types/domain";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: Event;
  onClick?: () => void;
  actionSlot?: React.ReactNode;
}

const phaseColors: Record<string, string> = {
  proposal: "bg-purple-500/20 text-purple-400",
  voting: "bg-warning/20 text-warning",
  scheduling: "bg-primary/20 text-primary",
  info: "bg-success/20 text-success",
};

export function EventCard({ event, onClick, actionSlot }: EventCardProps) {
  const formattedDate = new Date(event.createdAt).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
  });

  const participantCount = event.participants.length;
  const votedCount = event.participants.filter((p) => p.hasVoted).length;

  return (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden",
        "bg-card/60 hover:bg-card/80 border-border/50 hover:border-primary/30",
        "transition-all duration-300 hover:shadow-lg hover:shadow-primary/5",
        "rounded-2xl"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <Badge className={cn("rounded-lg font-medium", phaseColors[event.phase])}>
                {PhaseLabels[event.phase]}
              </Badge>
              <span className="text-xs text-muted-foreground">{formattedDate}</span>
            </div>

            {/* Title */}
            <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors truncate">
              {event.name}
            </h3>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {event.description}
              </p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatTimeWindow(event.timeWindow)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>{RegionLabels[event.locationRegion]}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Euro className="h-3.5 w-3.5" />
                <span>{formatBudget(event.budgetAmount, event.budgetType)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span>{votedCount}/{participantCount} abgestimmt</span>
              </div>
            </div>

            {/* Progress for voting phase */}
            {event.phase === "voting" && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Abstimmungsfortschritt</span>
                  <span className="text-primary font-medium">
                    {Math.round((votedCount / participantCount) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(votedCount / participantCount) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {actionSlot && (
              <div className="flex-shrink-0">
                {actionSlot}
              </div>
            )}
            <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all mt-auto" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
