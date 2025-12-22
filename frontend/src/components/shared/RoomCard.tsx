import { Users, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Room } from "@/types/domain";
import { cn } from "@/lib/utils";

interface RoomCardProps {
  room: Room;
  onClick?: () => void;
}

export function RoomCard({ room, onClick }: RoomCardProps) {
  // Determine member count display text
  const memberText = room.memberCount === 1 ? "Mitglied" : "Mitglieder";

  return (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden will-change-[transform,opacity]",
        "bg-card/60 hover:bg-card/90 border-border/50 hover:border-primary/40",
        "transition-all duration-300 ease-out",
        "hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1",
        "rounded-2xl motion-reduce:transform-none motion-reduce:hover:shadow-none",
        "active:scale-[0.98] active:shadow-md"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl ring-2 ring-border/30 group-hover:ring-primary/40 transition-all duration-300 shrink-0">
            <AvatarImage src={room.avatarUrl} className="object-cover" />
            <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-lg sm:text-xl font-bold text-primary">
              {room.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title */}
            <h3 className="font-semibold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors duration-200 truncate pr-2">
              {room.name}
            </h3>

            {/* Description */}
            {room.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {room.description}
              </p>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-2 pt-1">
              <Badge
                variant="secondary"
                className="gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-secondary/80 hover:bg-secondary"
              >
                <Users className="h-3.5 w-3.5" />
                <span>{room.memberCount} {memberText}</span>
              </Badge>
            </div>
          </div>

          {/* Arrow indicator */}
          <div className="flex items-center self-center shrink-0">
            <ChevronRight
              className={cn(
                "h-5 w-5 text-muted-foreground/40",
                "group-hover:text-primary group-hover:translate-x-1",
                "transition-all duration-300 ease-out",
                "motion-reduce:translate-x-0"
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loader that mirrors the RoomCard structure
 * for a polished loading experience
 */
export function RoomCardSkeleton() {
  return (
    <Card className="rounded-2xl border-border/50 bg-card/60 overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-4">
          {/* Avatar skeleton */}
          <Skeleton className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl shrink-0" />

          {/* Content skeleton */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Title skeleton */}
            <Skeleton className="h-5 sm:h-6 w-3/4 rounded-lg" />

            {/* Description skeleton */}
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>

            {/* Badge skeleton */}
            <Skeleton className="h-6 w-24 rounded-lg" />
          </div>

          {/* Arrow skeleton */}
          <Skeleton className="h-5 w-5 rounded shrink-0 self-center" />
        </div>
      </CardContent>
    </Card>
  );
}
