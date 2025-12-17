import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar as CalendarIcon, ArrowUpDown, UserX, CheckCircle, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthStore } from "@/stores/authStore";

import { DateProposal } from "../scheduling/DateProposal";
import { DateVotingCard } from "../scheduling/DateVotingCard";
import type { Event, DateOption } from "@/types/domain";

interface SchedulingPhaseProps {
  event: Event;
  onUpdate: (event: Event) => void;
  onFinalize: (dateOptionId: string) => void;
}

export const SchedulingPhase: React.FC<SchedulingPhaseProps> = ({ event, onUpdate, onFinalize }) => {
  const [sortByScore, setSortByScore] = useState(true);
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  const [dateToConfirm, setDateToConfirm] = useState<string | null>(null);
  const { user } = useAuthStore();
  const isOwner = user?.id === event.createdByUserId;

  // Helper to calc score
  const getScore = (opt: DateOption) =>
    opt.responses.reduce((acc, r) => {
      let val = 0;
      if (r.response === "yes") val = 2;
      if (r.response === "maybe") val = 1;
      if (r.isPriority) val += 1;
      return acc + val;
    }, 0);

  const sortedDates = useMemo(() => {
    const dates = [...event.dateOptions];
    const hasScores = dates.some((opt) => getScore(opt) > 0);
    if (sortByScore && hasScores) {
      return dates.sort((a, b) => getScore(b) - getScore(a)); // Descending score
    } else {
      return dates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Chronological
    }
  }, [event.dateOptions, sortByScore]);
  const topScore = useMemo(() => {
    const scores = event.dateOptions.map((opt) => getScore(opt));
    return scores.length > 0 ? Math.max(...scores) : 0;
  }, [event.dateOptions]);

  // Pending Voters Logic
  const pendingVoters = useMemo(() => {
    const activeVoterIds = new Set<string>();
    event.dateOptions.forEach(opt => {
        opt.responses.forEach(r => activeVoterIds.add(r.userId));
    });

    return event.participants.filter(p => !activeVoterIds.has(p.userId));
  }, [event]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header & Pending Voters */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Wann soll's losgehen?</h2>
          <p className="text-muted-foreground">
            Schlagt Termine vor und stimmt ab. Der Termin mit den meisten Punkten gewinnt.
          </p>
        </div>

        {/* Pending Voters Widget */}
        {pendingVoters.length > 0 && (
            <Card className="lg:w-72 bg-muted/30 border-dashed">
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <UserX className="h-4 w-4 text-muted-foreground" />
                        Noch keine Stimme
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="flex -space-x-2 overflow-hidden pt-2">
                        {pendingVoters.slice(0, 7).map(p => (
                            <TooltipProvider key={p.userId}>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Avatar className="h-8 w-8 border-2 border-background ring-1 ring-muted grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition-all">
                                            <AvatarImage src={p.avatarUrl} />
                                            <AvatarFallback>{(p.userName || "??").substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent>{p.userName || "Unbekannt"}</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                        {pendingVoters.length > 7 && (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
                                +{pendingVoters.length - 7}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        )}
      </div>

      <Separator />

      {/* Controls & Proposal */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="w-full sm:w-auto flex gap-2">
            <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSortByScore(!sortByScore)}
                className="w-full sm:w-auto"
            >
                <ArrowUpDown className="mr-2 h-4 w-4" />
                {sortByScore ? "Nach Beliebtheit" : "Chronologisch"}
            </Button>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
            {isOwner && event.dateOptions.length > 0 && (
                <>
                    <Dialog open={isFinalizeOpen} onOpenChange={setIsFinalizeOpen}>
                        <DialogTrigger asChild>
                            <Button variant="secondary" className="w-full sm:w-auto">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Termin fixieren
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Finalen Termin wählen</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                                {sortedDates.map((opt) => {
                                    const score = getScore(opt);
                                    const isTopScore = topScore > 0 && score === topScore;
                                    return (
                                        <div key={opt.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                                            <div>
                                                <div className="font-medium">
                                                    {format(new Date(opt.date), "EEE, d. MMM", { locale: de })}
                                                </div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <span>{score} Punkte</span>
                                                    {isTopScore && (
                                                        <Badge className="bg-yellow-500 text-white border-white border px-2 py-0.5">
                                                            <Trophy className="mr-1 h-3 w-3" />
                                                            Sieger
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <Button 
                                                size="sm" 
                                                onClick={() => setDateToConfirm(opt.id)}
                                            >
                                                Wählen
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </DialogContent>
                    </Dialog>

                    <AlertDialog open={!!dateToConfirm} onOpenChange={(open) => !open && setDateToConfirm(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Termin fixieren?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Möchtest du diesen Termin final setzen? Das Event wechselt dann in die Info-Phase und alle Teilnehmer werden benachrichtigt.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={() => {
                                    if (dateToConfirm) {
                                        onFinalize(dateToConfirm);
                                        setDateToConfirm(null);
                                        setIsFinalizeOpen(false);
                                    }
                                }}>
                                    Bestätigen
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            )}
            <div className="w-full sm:w-auto">
                <DateProposal event={event} onUpdate={onUpdate} />
            </div>
        </div>
      </div>

      {/* Voting List */}
      <div className="space-y-3">
        {sortedDates.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
                <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <h3 className="text-lg font-medium">Noch keine Termine</h3>
                <p className="text-muted-foreground">Schlage den ersten Termin vor!</p>
            </div>
        ) : (
            <AnimatePresence>
                {sortedDates.map((option, index) => (
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        key={option.id}
                    >
                        <DateVotingCard 
                            event={event} 
                            option={option} 
                            onUpdate={onUpdate} 
                        />
                        {/* Winner Badge for top item if sorted by score */}
                        {sortByScore && index === 0 && getScore(option) > 0 && (
                            <div className="absolute -top-3 -left-2 z-10">
                                <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white border-white border-2 shadow-sm">
                                    <Trophy className="w-3 h-3 mr-1" />
                                    Favorit
                                </Badge>
                            </div>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        )}
      </div>
    </div>
  );
};
