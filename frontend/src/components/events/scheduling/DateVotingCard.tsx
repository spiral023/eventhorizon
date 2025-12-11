import React from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Check, HelpCircle, X, Trash2, Star, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

  // Group responses for display
  const yesVoters = option.responses.filter(r => r.response === "yes");
  const maybeVoters = option.responses.filter(r => r.response === "maybe");
  // We don't usually show "No" voters in the main face pile to save space, or we can appended them at the end with low opacity
  const displayVoters = [...yesVoters, ...maybeVoters];

  const handleVote = async (response: DateResponseType) => {
    if (!user) return;
    try {
      const { data, error } = await respondToDateOption(
        event.id,
        option.id,
        response,
        isPriority
      );
      if (error || !data) throw new Error(error?.message);
      onUpdate(data);
    } catch (err) {
      toast({ title: "Fehler", description: "Konnte nicht abstimmen", variant: "destructive" });
    }
  };

  const togglePriority = async () => {
    if (!user || !myVote || myVote === "no") {
        toast({ title: "Nicht möglich", description: "Du musst zugesagt haben, um diesen Termin zu favorisieren.", variant: "destructive" });
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

  return (
    <Card className={cn(
        "group relative transition-all hover:shadow-md border-2",
        myVote === "yes" ? "border-green-500/20 bg-green-50/10" : 
        myVote === "maybe" ? "border-yellow-500/20 bg-yellow-50/10" : 
        "border-transparent"
    )}>
      {/* Top Section: Date & Info */}
      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-xl capitalize flex items-center gap-2">
            {format(new Date(option.date), "EEEE, d. MMMM", { locale: de })}
            {isPriority && <Star className="h-5 w-5 fill-yellow-500 text-yellow-500 animate-pulse" />}
          </CardTitle>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {(option.startTime || option.endTime) && (
                <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                    {option.startTime}
                    {option.endTime && ` – ${option.endTime}`} Uhr
                    </span>
                </div>
            )}
            <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span>{displayVoters.length} Stimmen</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
            {/* Score Badge */}
            <Badge variant="secondary" className="text-lg px-3 py-1 font-bold">
                {score} <span className="text-xs font-normal ml-1 text-muted-foreground">Pkt</span>
            </Badge>

            {/* Delete Button (Owner) */}
            {isOwner && (
                <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-8 w-8"
                onClick={handleDelete}
                >
                <Trash2 className="h-4 w-4" />
                </Button>
            )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Voting Action Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
                variant="outline"
                className={cn(
                    "h-auto py-3 flex flex-col gap-1 text-foreground hover:border-green-500/50 hover:bg-green-500/5 hover:text-green-500",
                    myVote === "yes" && "border-green-500 bg-green-500/10 text-green-600 ring-1 ring-green-500"
                )}
                onClick={() => handleVote("yes")}
            >
                <Check className="h-5 w-5" />
                <span className="text-xs font-medium">Bin dabei</span>
            </Button>

            <Button
                variant="outline"
                className={cn(
                    "h-auto py-3 flex flex-col gap-1 text-foreground hover:border-yellow-500/50 hover:bg-yellow-500/5 hover:text-yellow-600",
                    myVote === "maybe" && "border-yellow-500 bg-yellow-500/10 text-yellow-600 ring-1 ring-yellow-500"
                )}
                onClick={() => handleVote("maybe")}
            >
                <HelpCircle className="h-5 w-5" />
                <span className="text-xs font-medium">Vielleicht</span>
            </Button>

            <Button
                variant="outline"
                className={cn(
                    "h-auto py-3 flex flex-col gap-1 text-foreground hover:border-red-500/50 hover:bg-red-500/5 hover:text-red-600",
                    myVote === "no" && "border-red-500 bg-red-500/10 text-red-600 ring-1 ring-red-500"
                )}
                onClick={() => handleVote("no")}
            >
                <X className="h-5 w-5" />
                <span className="text-xs font-medium">Keine Zeit</span>
            </Button>

            <Button
                variant="outline"
                className={cn(
                    "h-auto py-3 flex flex-col gap-1 text-foreground hover:border-yellow-500/50 hover:bg-yellow-500/5 hover:text-yellow-600",
                    isPriority && "border-yellow-500 bg-yellow-500/10 text-yellow-700 ring-1 ring-yellow-500",
                    (myVote === "no" || !myVote) && "opacity-50 cursor-not-allowed"
                )}
                onClick={togglePriority}
                disabled={myVote === "no" || !myVote}
            >
                <Star className={cn("h-5 w-5", isPriority && "fill-current")} />
                <span className="text-xs font-medium">Favorit</span>
            </Button>
        </div>

        {/* Participants Avatars */}
        {displayVoters.length > 0 && (
            <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Zusagen ({yesVoters.length}) & Vielleicht ({maybeVoters.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {displayVoters.slice(0, 7).map((r) => (
                        <TooltipProvider key={r.userId}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="relative">
                                        <Avatar className={cn(
                                            "h-8 w-8 border-2 border-background ring-1",
                                            r.response === "yes" ? "ring-green-500/30" : "ring-yellow-500/30"
                                        )}>
                                            <AvatarImage src={r.avatarUrl} />
                                            <AvatarFallback className={cn(
                                                "text-[10px] font-medium",
                                                r.response === "yes" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                            )}>
                                                {(r.userName || "?").substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        {r.isPriority && (
                                            <div className="absolute -top-1 -right-1 bg-background rounded-full p-[1px]">
                                                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                            </div>
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-semibold">{r.userName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {r.response === "yes" ? "Nimmt teil" : "Vielleicht"}
                                        {r.isPriority ? " (Favorisiert)" : ""}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                    
                    {/* Overflow Indicator */}
                    {displayVoters.length > 7 && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted text-[10px] font-medium text-muted-foreground cursor-help">
                                        +{displayVoters.length - 7}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-h-60 overflow-y-auto">
                                    <div className="flex flex-col gap-1">
                                        {displayVoters.slice(7).map(r => (
                                            <span key={r.userId} className="text-xs">
                                                {r.userName} ({r.response === 'yes' ? 'Ja' : 'Vielleicht'})
                                            </span>
                                        ))}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
};
