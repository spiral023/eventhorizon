import React from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Check, HelpCircle, X, Trash2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/authStore";
import { respondToDateOption, deleteDateOption } from "@/services/apiClient";
import { useToast } from "@/hooks/use-toast";
import type { Event, DateOption, DateResponseType } from "@/types/domain";

interface DateVotingCardProps {
  event: Event;
  option: DateOption;
  onUpdate: (updatedEvent: Event) => void;
}

export const DateVotingCard: React.FC<DateVotingCardProps> = ({ event, option, onUpdate }) => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const isOwner = user?.id === event.createdByUserId;

  const myResponse = option.responses.find((r) => r.userId === user?.id);
  const myVote = myResponse?.response;
  const isPriority = myResponse?.isPriority;

  // Calculate Score
  const score = option.responses.reduce((acc, r) => {
    let val = 0;
    if (r.response === "yes") val = 2;
    if (r.response === "maybe") val = 1;
    if (r.isPriority) val += 1;
    return acc + val;
  }, 0);

  const handleVote = async (response: DateResponseType) => {
    if (!user) return;
    
    // Toggle logic: if clicking same vote, remove it? (Not typical for radio logic, but ok)
    // Actually, usually you just switch. Let's stick to switching.
    // If clicking same vote, we keep it.
    
    try {
      const { data, error } = await respondToDateOption(
        event.id,
        option.id,
        response,
        isPriority // Keep priority unless toggled separately
      );
      if (error || !data) throw new Error(error?.message);
      onUpdate(data);
    } catch (err) {
      toast({ title: "Fehler", description: "Konnte nicht abstimmen", variant: "destructive" });
    }
  };

  const togglePriority = async () => {
    if (!user || !myVote) {
        toast({ title: "Zuerst abstimmen", description: "Wähle Zusage oder Vielleicht, um zu priorisieren.", variant: "destructive" });
        return;
    }
    
    try {
      const { data, error } = await respondToDateOption(
        event.id,
        option.id,
        myVote,
        !isPriority
      );
      if (error || !data) throw new Error(error?.message);
      onUpdate(data);
    } catch (err) {
      toast({ title: "Fehler", description: "Konnte Priorität nicht ändern", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Diesen Termin wirklich löschen?")) return;
    try {
      const { data, error } = await deleteDateOption(event.id, option.id);
      if (error || !data) throw new Error(error?.message);
      onUpdate(data);
      toast({ title: "Termin gelöscht" });
    } catch (err) {
      toast({ title: "Fehler", description: "Konnte Termin nicht löschen", variant: "destructive" });
    }
  };

  const getVoteColor = (type: DateResponseType) => {
    switch (type) {
      case "yes": return "bg-green-500/20 text-green-600 hover:bg-green-500/30";
      case "maybe": return "bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30";
      case "no": return "bg-red-500/20 text-red-600 hover:bg-red-500/30";
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg border bg-card hover:shadow-sm transition-all group relative">
      {/* Delete Button (Owner) */}
      {isOwner && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-8 w-8"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      {/* Date & Time */}
      <div className="flex-1 min-w-[140px] text-center sm:text-left">
        <div className="font-semibold text-lg capitalize">
          {format(new Date(option.date), "EEE, d. MMM", { locale: de })}
        </div>
        {(option.startTime || option.endTime) && (
          <div className="text-sm text-muted-foreground">
            {option.startTime}
            {option.endTime && ` – ${option.endTime}`} Uhr
          </div>
        )}
      </div>

      {/* Voting Controls */}
      <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-full border">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote("yes")}
                className={cn(
                  "rounded-full w-9 h-9 p-0 transition-all",
                  myVote === "yes" ? "bg-green-500 text-white hover:bg-green-600 shadow-sm" : "hover:bg-green-500/10 hover:text-green-600 text-muted-foreground"
                )}
              >
                <Check className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bin dabei (+2)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote("maybe")}
                className={cn(
                  "rounded-full w-9 h-9 p-0 transition-all",
                  myVote === "maybe" ? "bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm" : "hover:bg-yellow-500/10 hover:text-yellow-600 text-muted-foreground"
                )}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Vielleicht (+1)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote("no")}
                className={cn(
                  "rounded-full w-9 h-9 p-0 transition-all",
                  myVote === "no" ? "bg-red-500 text-white hover:bg-red-600 shadow-sm" : "hover:bg-red-500/10 hover:text-red-600 text-muted-foreground"
                )}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Keine Zeit (0)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Priority Toggle */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePriority}
              disabled={myVote === "no"}
              className={cn(
                "rounded-full transition-all",
                isPriority ? "text-yellow-500 hover:text-yellow-600 bg-yellow-500/10" : "text-muted-foreground/30 hover:text-yellow-500"
              )}
            >
              <Star className={cn("h-5 w-5", isPriority && "fill-current")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Favorit (+1 Punkt)</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Results / Avatars */}
      <div className="flex-1 flex items-center justify-end gap-3 min-w-[120px]">
        {/* Avatars */}
        <div className="flex -space-x-2 overflow-hidden">
          {option.responses
            .filter(r => r.response !== "no") // Only show yes/maybe
            .slice(0, 5) // Limit
            .map((r) => (
              <TooltipProvider key={r.userId}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className={cn(
                        "h-8 w-8 border-2 border-background ring-1",
                        r.response === "yes" ? "ring-green-500/30" : "ring-yellow-500/30"
                    )}>
                      <AvatarImage src="" /> {/* Avatar URL missing in response type right now, using fallback */}
                      <AvatarFallback className={cn(
                          "text-[10px]",
                          r.response === "yes" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                      )}>
                        {r.userName?.substring(0, 2).toUpperCase()}
                        {r.isPriority && <Star className="absolute -top-1 -right-1 h-3 w-3 fill-yellow-500 text-yellow-500" />}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    {r.userName} ({r.response === "yes" ? "Ja" : "Vielleicht"})
                    {r.isPriority && " ⭐"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            {option.responses.filter(r => r.response !== "no").length > 5 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
                    +{option.responses.filter(r => r.response !== "no").length - 5}
                </div>
            )}
        </div>

        {/* Score Badge */}
        <div className="flex flex-col items-center justify-center min-w-[40px] px-2 py-1 bg-secondary rounded-md">
            <span className="text-sm font-bold">{score}</span>
            <span className="text-[10px] text-muted-foreground uppercase">Pkt</span>
        </div>
      </div>
    </div>
  );
};
