import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Euro, Users, Calendar, Clock, CheckCircle, Check, ArrowRight, ChevronDown, Info, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { VotingCard } from "@/components/events/VotingCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { SchedulingPhase } from "@/components/events/phase/SchedulingPhase";
import { EventActionsPanel } from "@/components/events/EventActionsPanel";
import { BookingRequestDialog } from "@/components/activities/BookingRequestDialog";
import {
  getEventByCode,
  getActivities,
  voteOnActivity,
  updateEventPhase,
  selectWinningActivity,
  finalizeDateOption,
  excludeActivity,
  includeActivity,
} from "@/services/apiClient";
import type { Event, Activity, VoteType, EventPhase, ActivityVote } from "@/types/domain";
import { 
  RegionLabels, 
  formatTimeWindow, 
  formatBudget,
  CategoryLabels,
  PhaseLabels,
  PhaseDescriptions
} from "@/types/domain";
import { useAuthStore } from "@/stores/authStore";
import { getNextPhases, isPhaseCompleted, isPhaseCurrent } from "@/utils/phaseStateMachine";
import { cn } from "@/lib/utils";

export default function EventDetailPage() {
  const { accessCode, eventCode } = useParams<{ accessCode: string; eventCode: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("proposal");
  const [phaseMenuOpen, setPhaseMenuOpen] = useState(false);
  const [missingActivityDialogOpen, setMissingActivityDialogOpen] = useState(false);
  const [missingDateDialogOpen, setMissingDateDialogOpen] = useState(false);
  const [pendingVoteIds, setPendingVoteIds] = useState<Set<string>>(() => new Set());
  
  // Track previous phase to only auto-switch tab when phase actually changes
  const prevPhaseRef = useRef<EventPhase | null>(null);
  const activityOrderRef = useRef<string[]>([]);
  const lastActivityOrderKeyRef = useRef<string>("");

  const currentUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUserId = currentUser?.id ?? "";
  const isCreator = !!(event?.createdByUserId && currentUserId === event.createdByUserId);

  useEffect(() => {
    const fetchData = async () => {
      if (!eventCode) return;
      const [eventResult, activitiesResult] = await Promise.all([
        getEventByCode(eventCode),
        getActivities(),
      ]);
      setEvent(eventResult.data);
      setActivities(activitiesResult.data);
      
      // Initial tab set
      if (eventResult.data) {
        setActiveTab(eventResult.data.phase);
        prevPhaseRef.current = eventResult.data.phase;
      }
      
      setLoading(false);
    };
    fetchData();
  }, [eventCode]);

  // Update active tab when event phase advances
  useEffect(() => {
    if (event?.phase && event.phase !== prevPhaseRef.current) {
      setActiveTab(event.phase);
      prevPhaseRef.current = event.phase;
    }
  }, [event?.phase]);

  const handleVote = async (activityId: string, vote: VoteType) => {
    const resolvedEventCode = event?.shortCode || event?.id || eventCode;
    if (!resolvedEventCode || !event || !isAuthenticated) return;
    if (pendingVoteIds.has(activityId)) return;
    
    // Optimistic Update
    const previousEvent = currentUser ? { ...event } : null;
    const canOptimisticallyUpdate = Boolean(currentUser);

    setPendingVoteIds((prev) => {
      const next = new Set(prev);
      next.add(activityId);
      return next;
    });
    
    if (canOptimisticallyUpdate) {
      setEvent((prev) => {
        if (!prev || !currentUser) return prev;
      
        const newActivityVotes = prev.activityVotes.map((av) => {
          if (av.activityId !== activityId) return av;
        
          // Remove existing vote by this user
          const filteredVotes = av.votes.filter((v) => v.userId !== currentUser.id);
        
          // Add new vote
          filteredVotes.push({
            userId: currentUser.id,
            userName: currentUser.name,
            vote: vote,
            votedAt: new Date().toISOString(),
          });
        
          return {
            ...av,
            votes: filteredVotes,
          };
        });

        // If this activity had no votes entry yet, create it
        if (!prev.activityVotes.find(av => av.activityId === activityId)) {
          newActivityVotes.push({
            activityId,
            votes: [{
              userId: currentUser.id,
              userName: currentUser.name,
              vote: vote,
              votedAt: new Date().toISOString(),
            }]
          });
        }

        // Also update participant hasVoted status
        const newParticipants = prev.participants.map(p => 
          p.userId === currentUser.id ? { ...p, hasVoted: true } : p
        );

        return {
          ...prev,
          activityVotes: newActivityVotes,
          participants: newParticipants
        };
      });
    }

    try {
      const result = await voteOnActivity(resolvedEventCode, activityId, vote);
      if (result.data) {
        setEvent(result.data);
      } else {
        const fallback = await getEventByCode(resolvedEventCode);
        if (fallback.data) {
          setEvent(fallback.data);
        } else if (previousEvent) {
          // Revert on failure (no data returned usually means error in this client pattern if not caught)
          setEvent(previousEvent);
        }
      }
    } catch (error) {
      // Revert on error
      const fallback = await getEventByCode(resolvedEventCode);
      if (fallback.data) {
        setEvent(fallback.data);
      } else if (previousEvent) {
        setEvent(previousEvent);
      }
    } finally {
      setPendingVoteIds((prev) => {
        const next = new Set(prev);
        next.delete(activityId);
        return next;
      });
    }
  };

  const handleAdvancePhase = async () => {
    if (!event || !eventCode) return;
    if (event.phase === "voting" && !event.chosenActivityId) {
      setMissingActivityDialogOpen(true);
      return;
    }
    if (event.phase === "scheduling" && !event.finalDateOptionId) {
      setMissingDateDialogOpen(true);
      return;
    }
    const nextPhases = getNextPhases(event.phase);
    if (nextPhases.length > 0) {
      setActionLoading(true);
      const result = await updateEventPhase(eventCode, nextPhases[0]);
      if (result.data) {
        setEvent(result.data);
      }
      setActionLoading(false);
    }
  };

  const handleSelectActivity = async (activityId: string) => {
    if (!eventCode) return;
    setActionLoading(true);
    const result = await selectWinningActivity(eventCode, activityId);
    if (result.data) {
      setEvent(result.data);
    }
    setActionLoading(false);
  };

  const handleToggleExclusion = async (activityId: string, currentlyExcluded: boolean) => {
    if (!eventCode) return;
    setActionLoading(true);
    let result;
    if (currentlyExcluded) {
      result = await includeActivity(eventCode, activityId);
    } else {
      result = await excludeActivity(eventCode, activityId);
    }
    if (result.data) {
      setEvent(result.data);
    }
    setActionLoading(false);
  };

  const handleFinalizeDate = async (dateOptionId: string) => {
    if (!eventCode) return;
    setActionLoading(true);
    const result = await finalizeDateOption(eventCode, dateOptionId);
    if (result.data) {
      setEvent(result.data);
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary/30 rounded animate-pulse" />
        <div className="h-24 bg-secondary/30 rounded-2xl animate-pulse" />
        <div className="h-64 bg-secondary/30 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!event) {
    return (
      <EmptyState
        icon={Calendar}
        title="Event nicht gefunden"
        description="Das gesuchte Event existiert nicht oder wurde gelöscht."
        action={
          <Button onClick={() => navigate(`/rooms/${accessCode}`)} className="rounded-xl">
            Zurück zum Raum
          </Button>
        }
      />
    );
  }

  const proposedActivities = activities.filter((a) =>
    event.proposedActivityIds.includes(a.id)
  );

  const nonExcludedProposedActivities = proposedActivities.filter(
    (a) => !event.excludedActivityIds?.includes(a.id)
  );

  const chosenActivity = event.chosenActivityId
    ? activities.find((a) => a.id === event.chosenActivityId)
    : null;

  const finalDateOption = event.finalDateOptionId
    ? event.dateOptions.find((d) => d.id === event.finalDateOptionId)
    : null;
  const finalDateParticipantsCount = finalDateOption
    ? finalDateOption.responses.filter((response) => response.response === "yes").length
    : undefined;

  const formatDuration = (activity: Activity | null) => {
    if (!activity) return "–";
    if (activity.duration) return activity.duration;
    if (typeof activity.typicalDurationHours === "number") {
      return `${activity.typicalDurationHours}h`;
    }
    return "–";
  };

  const activityVotesById = new Map<string, ActivityVote>();
  event.activityVotes.forEach((activityVote) => {
    activityVotesById.set(activityVote.activityId, activityVote);
  });

  const getActivityScore = (activityId: string) => {
    const votes = activityVotesById.get(activityId)?.votes || [];
    const forVotes = votes.filter((v) => v.vote === "for").length;
    const againstVotes = votes.filter((v) => v.vote === "against").length;
    return forVotes - againstVotes;
  };

  const rankedActivities = [...nonExcludedProposedActivities].sort((a, b) => {
    return getActivityScore(b.id) - getActivityScore(a.id);
  });
  const rankByActivityId = new Map<string, number>();
  rankedActivities.forEach((activity, index) => {
    rankByActivityId.set(activity.id, index + 1);
  });

  const activityOrderKey = nonExcludedProposedActivities.map((activity) => activity.id).join("|");
  if (activityOrderKey !== lastActivityOrderKeyRef.current) {
    if (nonExcludedProposedActivities.length === 0) {
      activityOrderRef.current = [];
    } else {
      const activityIds = nonExcludedProposedActivities.map((activity) => activity.id);
      const idSet = new Set(activityIds);
      const kept = activityOrderRef.current.filter((id) => idSet.has(id));
      const missing = activityIds.filter((id) => !kept.includes(id));
      const nextOrder = kept.length > 0
        ? [...kept, ...missing]
        : rankedActivities.map((activity) => activity.id);
      activityOrderRef.current = nextOrder;
    }
    lastActivityOrderKeyRef.current = activityOrderKey;
  }

  const orderedActivities = activityOrderRef.current
    .map((id) => nonExcludedProposedActivities.find((activity) => activity.id === id))
    .filter((activity): activity is Activity => Boolean(activity));
  const displayActivities = orderedActivities.length > 0
    ? orderedActivities
    : nonExcludedProposedActivities;

  const nextPhases = getNextPhases(event.phase);
  const canAdvance = nextPhases.length > 0;
  const canVote = event.phase === "voting" && isAuthenticated;
  
  // Phase helper
  const phaseOrder: EventPhase[] = ["proposal", "voting", "scheduling", "info"];
  
  // Helper to determine if we should allow clicking a tab
  // We generally allow navigation to any past or current phase.
  // Future phases are disabled unless they are the "next" logical step (though usually we block them until advanced).
  // Ideally, users can see where they are going, but not interact with future phases yet.
  
  const handleEventUpdated = (updatedEvent: Event) => setEvent(updatedEvent);
  const outstandingVotes = event.participants.filter((p) => !p.hasVoted).length;
  const votedCount = event.participants.length - outstandingVotes;

  return (
    <div className="space-y-6">
      <AlertDialog open={missingActivityDialogOpen} onOpenChange={setMissingActivityDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aktivität auswählen</AlertDialogTitle>
            <AlertDialogDescription>
              Wähle zuerst eine Gewinner-Aktivität aus der Abstimmung, bevor du in die Terminfindungs-Phase wechselst.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setMissingActivityDialogOpen(false);
              setActiveTab("voting");
            }}>
              Zur Abstimmung
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={missingDateDialogOpen} onOpenChange={setMissingDateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Termin festlegen</AlertDialogTitle>
            <AlertDialogDescription>
              Bitte fixiere einen Termin, bevor du zur finalen Info-Phase wechselst.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setMissingDateDialogOpen(false);
              setActiveTab("scheduling");
            }}>
              Zur Terminfindung
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
        onClick={() => navigate(`/rooms/${accessCode}`)}
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Raum
      </Button>

      {/* Modern Header Layout */}
      <div className="grid gap-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-5">
            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-border/40 bg-secondary/20 shadow-sm">
              {event.avatarUrl ? (
                <img src={event.avatarUrl} alt={event.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Calendar className="h-8 w-8 opacity-50" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                 {isCreator && (
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase font-bold tracking-wider">
                    Admin
                  </Badge>
                )}
                <span>{RegionLabels[event.locationRegion]}</span>
                <span>•</span>
                <span>{formatTimeWindow(event.timeWindow)}</span>
              </div>
              {event.description && event.description.trim().length > 0 && (
                <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl">
                  {event.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              {/* Stats */}
              <div className="flex items-center gap-4 px-4 py-2 rounded-2xl bg-secondary/30 border border-border/40 w-full sm:w-auto">
                <div className="text-center">
                  <div className="text-lg font-bold leading-none">{event.participants.length}</div>
                  <div className="text-[10px] uppercase text-muted-foreground font-medium mt-0.5">Dabei</div>
                </div>
                <div className="h-8 w-px bg-border/40" />
                <div className="text-center">
                  <div className="text-lg font-bold leading-none">{votedCount}</div>
                  <div className="text-[10px] uppercase text-muted-foreground font-medium mt-0.5">Voted</div>
                </div>
              </div>

              {/* Current phase popover */}
              <Popover open={phaseMenuOpen} onOpenChange={setPhaseMenuOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="secondary"
                    className="w-full sm:w-auto justify-between sm:justify-start rounded-full border border-border/60 bg-card/70 text-foreground shadow-sm px-4 py-2 gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary">
                        {phaseOrder.indexOf(activeTab as EventPhase) + 1}
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-semibold leading-none">
                          {PhaseLabels[activeTab as EventPhase]}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-none mt-1 line-clamp-1">
                          {PhaseDescriptions[activeTab as EventPhase]}
                        </span>
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-2">
                  <div className="space-y-1">
                    {phaseOrder.map((phase, index) => {
                      const isCompleted = isPhaseCompleted(phase, event.phase);
                      const isCurrent = isPhaseCurrent(phase, event.phase);
                      const isFuture = !isCompleted && !isCurrent;
                      const isActive = activeTab === phase;

                      return (
                        <button
                          key={phase}
                          onClick={() => {
                            setActiveTab(phase);
                            setPhaseMenuOpen(false);
                          }}
                          disabled={isFuture && !isCompleted && !isCurrent}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "hover:bg-secondary/60 text-foreground",
                            (isFuture && !isCompleted && !isCurrent) && "opacity-50 cursor-not-allowed hover:bg-transparent"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold",
                              isActive
                                ? "border-primary-foreground/40 bg-primary-foreground/20"
                                : isCompleted
                                  ? "border-primary bg-primary text-primary-foreground border-transparent"
                                  : "border-muted-foreground/30 text-muted-foreground"
                            )}
                          >
                            {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <div
                              className={cn(
                                "text-sm font-semibold leading-tight",
                                isActive && "text-primary-foreground"
                              )}
                            >
                              {PhaseLabels[phase]}
                            </div>
                            <div
                              className={cn(
                                "text-xs leading-snug text-muted-foreground",
                                isActive && "text-primary-foreground/80"
                              )}
                            >
                              {PhaseDescriptions[phase]}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <EventActionsPanel
                event={event}
                isCreator={!!isCreator}
                activePhase={activeTab as EventPhase}
                onEventUpdated={handleEventUpdated}
                className="bg-background rounded-full border shadow-sm p-1 w-full sm:w-auto"
              />

              {canAdvance && activeTab === event.phase && (
                <Button
                  onClick={handleAdvancePhase}
                  disabled={actionLoading}
                  className="rounded-full px-6 py-2 text-sm font-semibold shadow-md transition-all duration-200 ease-in-out bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
                >
                  Nächste Phase <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Note: TabsList is removed, handled by custom stepper above */}
        
        {/* Phase Content */}
        <TabsContent value="proposal" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <Card className="bg-card/60 border-border/50 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Vorgeschlagene Aktivitäten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {proposedActivities.map((activity) => {
                const isExcluded = event.excludedActivityIds?.includes(activity.id);
                return (
                  <div 
                    key={activity.id} 
                    className={cn(
                      "p-4 rounded-xl bg-secondary/30 flex flex-col sm:flex-row gap-3 sm:gap-4 transition-all hover:bg-secondary/40",
                      isExcluded && "opacity-50 grayscale"
                    )}
                  >
                    <img
                      src={activity.imageUrl}
                      alt={activity.title}
                      className="w-full sm:w-20 h-32 sm:h-20 rounded-lg object-cover bg-muted"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                         <h4 className="font-semibold line-clamp-1">{activity.title}</h4>
                         <Badge variant="secondary" className="text-[10px] h-5">{CategoryLabels[activity.category]}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{activity.shortDescription}</p>
                      {isExcluded && <Badge variant="destructive" className="h-5 text-[10px]">Ausgeschlossen</Badge>}
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:ml-auto w-full sm:w-auto">
                      {isCreator && event.phase === "proposal" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn(
                            "w-full sm:w-auto h-8 text-xs",
                            isExcluded
                              ? "text-success hover:text-success hover:bg-success/10"
                              : "text-destructive hover:text-destructive hover:bg-destructive/10"
                          )}
                          onClick={() => handleToggleExclusion(activity.id, isExcluded)}
                          disabled={actionLoading}
                        >
                          {isExcluded ? "Aufnehmen" : "Ausschließen"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {proposedActivities.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Noch keine Aktivitäten.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voting" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Stimme für deine Favoriten. Die beliebtesten Aktivitäten steigen auf.
            </p>
          </div>
          {displayActivities.length > 0 ? (
            <div className="space-y-4">
              {displayActivities.map((activity) => (
                <div key={activity.id}>
                  <VotingCard
                    activity={activity}
                    votes={activityVotesById.get(activity.id)}
                    currentUserId={currentUserId}
                    onVote={handleVote}
                    isLoading={pendingVoteIds.has(activity.id)}
                    disabled={!canVote}
                    isOwner={isCreator}
                    onSelect={() => handleSelectActivity(activity.id)}
                    rank={rankByActivityId.get(activity.id)}
                    participants={event.participants}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="Keine Aktivitäten"
              description="Es gibt nichts zum Abstimmen."
            />
          )}
        </TabsContent>

        <TabsContent value="scheduling" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <SchedulingPhase event={event} onUpdate={setEvent} onFinalize={handleFinalizeDate} />
          
           {canAdvance && event.dateOptions.length > 0 && isCreator && (
             <Card className="bg-primary/5 border-primary/20 rounded-2xl mt-6">
                <CardContent className="p-4">
                   <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-primary">Termin festlegen</h4>
                        <p className="text-sm text-muted-foreground">Wähle den finalen Termin um das Event abzuschließen.</p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
                        {event.dateOptions.map((opt) => (
                          <Button 
                            key={opt.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleFinalizeDate(opt.id)}
                            className="rounded-xl border-primary/30 hover:bg-primary/10 hover:text-primary"
                            disabled={actionLoading}
                          >
                            {new Date(opt.date).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                            {opt.startTime && ` • ${opt.startTime}`}
                          </Button>
                        ))}
                      </div>
                   </div>
                </CardContent>
              </Card>
          )}
        </TabsContent>

        <TabsContent value="info" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20 rounded-3xl overflow-hidden">
            <CardContent className="p-8 text-center space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                 <CheckCircle className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">Event finalisiert!</h3>
                <p className="text-muted-foreground max-w-md mx-auto mt-2">
                  Alle Details stehen fest. Wir wünschen euch viel Spaß!
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Activity */}
            {chosenActivity && (
              <Card className="rounded-3xl overflow-hidden h-full flex flex-col border-border/60 shadow-sm">
                <div className="h-56 w-full relative">
                  <img 
                    src={chosenActivity.imageUrl} 
                    alt={chosenActivity.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                     <Badge variant="secondary" className="mb-2 backdrop-blur-md bg-white/20 text-white border-white/20">
                      {CategoryLabels[chosenActivity.category]}
                    </Badge>
                    <h3 className="text-2xl font-bold leading-tight">{chosenActivity.title}</h3>
                  </div>
                </div>
                <CardContent className="space-y-5 flex-1 p-6">
                  <p className="text-muted-foreground leading-relaxed">{chosenActivity.shortDescription}</p>
                  
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                         <Euro className="h-4 w-4" />
                      </div>
                      <span>
                        {chosenActivity.estPricePerPerson !== undefined
                          ? `~${chosenActivity.estPricePerPerson}€ p.P.`
                          : "Preis auf Anfrage"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                         <Clock className="h-4 w-4" />
                      </div>
                      <span>{formatDuration(chosenActivity)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm col-span-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                         <MapPin className="h-4 w-4" />
                      </div>
                      <span>{RegionLabels[chosenActivity.locationRegion]} {chosenActivity.locationCity && `• ${chosenActivity.locationCity}`}</span>
                    </div>
                    {typeof chosenActivity.maxCapacity === "number" && (
                      <div className="flex items-center gap-3 text-sm col-span-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                           <Users className="h-4 w-4" />
                        </div>
                        <span>Geeignet für bis zu {chosenActivity.maxCapacity} Personen</span>
                      </div>
                    )}
                  </div>
                  
                  {(chosenActivity.website || chosenActivity.reservationUrl || isCreator) && (
                     <div className="flex gap-2 pt-2">
                        {chosenActivity.website && (
                          <Button variant="outline" className="flex-1 rounded-xl" asChild>
                            <a href={chosenActivity.website} target="_blank" rel="noopener noreferrer">Webseite</a>
                          </Button>
                        )}
                        {isCreator ? (
                          <BookingRequestDialog
                            activity={chosenActivity}
                            defaultDate={finalDateOption?.date}
                            defaultStartTime={finalDateOption?.startTime}
                            defaultEndTime={finalDateOption?.endTime}
                            defaultParticipants={finalDateParticipantsCount}
                          >
                            <Button className="flex-1 rounded-xl">
                              Buchungsanfrage senden
                            </Button>
                          </BookingRequestDialog>
                        ) : chosenActivity.reservationUrl ? (
                          <Button className="flex-1 rounded-xl" asChild>
                            <a href={chosenActivity.reservationUrl} target="_blank" rel="noopener noreferrer">Reservieren</a>
                          </Button>
                        ) : null}
                     </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Date */}
            {finalDateOption && (
              <Card className="rounded-3xl h-full flex flex-col border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Termin
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center items-center text-center p-8">
                  <div className="mb-6 p-6 bg-primary/5 rounded-3xl text-primary ring-1 ring-primary/10">
                    <span className="text-5xl font-bold block tracking-tighter">
                      {new Date(finalDateOption.date).getDate()}
                    </span>
                    <span className="text-xl uppercase font-medium tracking-widest opacity-80">
                      {new Date(finalDateOption.date).toLocaleDateString("de-DE", { month: "short" })}
                    </span>
                  </div>
                  
                  <h4 className="text-3xl font-bold mb-2">
                    {new Date(finalDateOption.date).toLocaleDateString("de-DE", { weekday: "long" })}
                  </h4>
                  
                  <p className="text-muted-foreground text-xl">
                    {new Date(finalDateOption.date).toLocaleDateString("de-DE", { year: "numeric" })}
                  </p>

                  {(finalDateOption.startTime) && (
                    <div className="mt-8 flex items-center gap-2 px-5 py-2.5 bg-secondary rounded-full">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">
                        {finalDateOption.startTime}
                        {finalDateOption.endTime && ` – ${finalDateOption.endTime}`} Uhr
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
