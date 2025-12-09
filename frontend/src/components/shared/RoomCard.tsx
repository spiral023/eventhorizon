import { Users, Calendar, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import type { Room } from "@/types/domain";
import { cn } from "@/lib/utils";

interface RoomCardProps {
  room: Room;
  onClick?: () => void;
}

export function RoomCard({ room, onClick }: RoomCardProps) {
  const formattedDate = new Date(room.createdAt).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden will-change-[transform,opacity]",
        "bg-card/60 hover:bg-card/80 border-border/50 hover:border-primary/30",
        "transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
        "rounded-2xl motion-reduce:transform-none motion-reduce:hover:shadow-none"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 rounded-xl ring-2 ring-border/50 group-hover:ring-primary/30 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
            <AvatarImage src={room.avatarUrl} className="object-cover" />
            <AvatarFallback className="rounded-xl bg-secondary text-lg font-semibold">
              {room.name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {room.name}
            </h3>
            {room.description && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {room.description}
              </p>
            )}

            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span>{room.memberCount} Mitglieder</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:translate-x-0" />
        </div>
      </CardContent>
    </Card>
  );
}
