import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Euro, Users, Calendar, Clock, CheckCircle, Globe, Facebook, Instagram, BookOpen, CloudSun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventPhaseHeader } from "@/components/events/EventPhaseHeader";
import { VotingCard } from "@/components/events/VotingCard";
import { EmailActions } from "@/components/events/EmailActions";
import { EmptyState } from "@/components/shared/EmptyState";
import { SchedulingPhase } from "@/components/events/phase/SchedulingPhase";
import { PhaseComments } from "@/components/events/PhaseComments";
import { 
  getEventById, 
  getActivities, 
  voteOnActivity, 
  updateEventPhase,
  selectWinningActivity,
  finalizeDateOption,
  excludeActivity,
  includeActivity,
} from "@/services/apiClient";
import type { Event, Activity, VoteType, EventPhase } from "@/types/domain";
import { 
  RegionLabels, 
  formatTimeWindow, 
  formatBudget,
  CategoryLabels
} from "@/types/domain";
import { useAuthStore } from "@/stores/authStore";
import { getNextPhases, getPhaseIndex } from "@/utils/phaseStateMachine";
import { cn } from "@/lib/utils";

export default function EventDetailPage() {
  const { roomId, eventId } = useParams<{ roomId: string; eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("proposal");
  
  // Track previous phase to only auto-switch tab when phase actually changes
  const prevPhaseRef = useRef<EventPhase | null>(null);

  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?.id ?? "";
  const isCreator = event?.createdByUserId && currentUserId === event.createdByUserId;

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      const [eventResult, activitiesResult] = await Promise.all([
        getEventById(eventId),
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
  }, [eventId]);

  // Update active tab when event phase advances
  useEffect(() => {
    if (event?.phase && event.phase !== prevPhaseRef.current) {
      setActiveTab(event.phase);
      prevPhaseRef.current = event.phase;
    }
  }, [event?.phase]);

  const handleVote = async (activityId: string, vote: VoteType) => {
    if (!eventId) return;
    setActionLoading(true);
    const result = await voteOnActivity(eventId, activityId, vote);
    if (result.data) {
      setEvent(result.data);
    }
    setActionLoading(false);
  };

  const handleAdvancePhase = async () => {
    if (!event || !eventId) return;
    const nextPhases = getNextPhases(event.phase);
    if (nextPhases.length > 0) {
      setActionLoading(true);
      const result = await updateEventPhase(eventId, nextPhases[0]);
      if (result.data) {
        setEvent(result.data);
      }
      setActionLoading(false);
    }
  };

  const handleSelectActivity = async (activityId: string) => {
    if (!eventId) return;
    setActionLoading(true);
    const result = await selectWinningActivity(eventId, activityId);
    if (result.data) {
      setEvent(result.data);
    }
    setActionLoading(false);
  };

  const handleToggleExclusion = async (activityId: string, currentlyExcluded: boolean) => {
    if (!eventId) return;
    setActionLoading(true);
    let result;
    if (currentlyExcluded) {
      result = await includeActivity(eventId, activityId);
    } else {
      result = await excludeActivity(eventId, activityId);
    }
    if (result.data) {
      setEvent(result.data);
    }
    setActionLoading(false);
  };

  const handleFinalizeDate = async (dateOptionId: string) => {
    if (!eventId) return;
    setActionLoading(true);
    const result = await finalizeDateOption(eventId, dateOptionId);
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
          <Button onClick={() => navigate(`/rooms/${roomId}`)} className="rounded-xl">
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

  const sortedActivities = [...nonExcludedProposedActivities].sort((a, b) => {
    const votesA = event.activityVotes.find((v) => v.activityId === a.id);
    const votesB = event.activityVotes.find((v) => v.activityId === b.id);
    const scoreA = (votesA?.votes.filter((v) => v.vote === "for").length || 0) -
                   (votesA?.votes.filter((v) => v.vote === "against").length || 0);
    const scoreB = (votesB?.votes.filter((v) => v.vote === "for").length || 0) -
                   (votesB?.votes.filter((v) => v.vote === "against").length || 0);
    return scoreB - scoreA;
  });

  const nextPhases = getNextPhases(event.phase);
  const canAdvance = nextPhases.length > 0;
  
  // Phase helper
  const phases: EventPhase[] = ["proposal", "voting", "scheduling", "info"];
  const isPhaseEnabled = (phase: EventPhase) => {
    if (!event) return false;
    const currentIdx = phases.indexOf(event.phase);
    const targetIdx = phases.indexOf(phase);
    if (currentIdx === -1) return true; // Fallback
    return targetIdx <= currentIdx;
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 -ml-2"
        onClick={() => navigate(`/rooms/${roomId}`)}
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Raum
      </Button>

      {/* Event Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
          {event.description && (
            <p className="text-muted-foreground mt-1">{event.description}</p>
          )}
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{formatTimeWindow(event.timeWindow)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            <span>{RegionLabels[event.locationRegion]}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Euro className="h-4 w-4" />
            <span>{formatBudget(event.budgetAmount, event.budgetType)}</span>
          </div>
      <div className="flex items-center gap-1.5">
        <Users className="h-4 w-4" />
        <span>{event.participants.length} Teilnehmer</span>
      </div>
    </div>
  </div>
      {/* Phase Header */}
      <EventPhaseHeader
        currentPhase={event.phase}
        onPhaseClick={setActiveTab}
        canAdvance={canAdvance}
        onAdvance={handleAdvancePhase}
      />

      {/* Communication & Actions */}
      <div className="grid gap-6">
        <EmailActions eventId={event.id}>
           <PhaseComments eventId={event.id} phase={activeTab as EventPhase} />
        </EmailActions>
      </div>

      {/* Phase Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        
        {/* Proposal Phase */}
        <TabsContent value="proposal" className="space-y-4">
          <Card className="bg-card/60 border-border/50 rounded-2xl">
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
                      "p-4 rounded-xl bg-secondary/30 flex items-center gap-4",
                      isExcluded && "opacity-50"
                    )}
                  >
                    <img
                      src={activity.imageUrl}
                      alt={activity.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{activity.title}</h4>
                      <p className="text-sm text-muted-foreground">{activity.shortDescription}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{CategoryLabels[activity.category]}</Badge>
                      {isExcluded && (
                        <Badge variant="destructive" className="ml-2">Ausgeschlossen</Badge>
                      )}
                      {isCreator && event.phase === "proposal" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn(
                            isExcluded ? "text-success hover:text-success" : "text-destructive hover:text-destructive"
                          )}
                          onClick={() => handleToggleExclusion(activity.id, isExcluded)}
                          disabled={actionLoading}
                        >
                          {isExcluded ? "Wieder aufnehmen" : "Ausschließen"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {canAdvance && event.phase === "proposal" && (
                <Button
                  onClick={handleAdvancePhase}
                  className="w-full rounded-xl"
                  disabled={actionLoading}
                >
                  Zur Abstimmung übergehen
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voting Phase */}
        <TabsContent value="voting" className="space-y-4">
          <p className="text-muted-foreground">
            Stimme über die Aktivitäten ab – die beliebtesten rücken nach oben.
          </p>
          {sortedActivities.length > 0 ? (
            <AnimatePresence>
              {sortedActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <VotingCard
                    activity={activity}
                    votes={event.activityVotes.find((v) => v.activityId === activity.id)}
                    currentUserId={currentUserId}
                    onVote={handleVote}
                    isLoading={actionLoading}
                    disabled={event.phase !== "voting"}
                    isOwner={isCreator}
                    onSelect={() => handleSelectActivity(activity.id)}
                    rank={index + 1}
                    participants={event.participants}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <EmptyState
              icon={Users}
              title="Keine Aktivitäten zur Abstimmung"
              description="Alle Aktivitäten wurden ausgeschlossen oder es wurden noch keine vorgeschlagen."
            />
          )}
        </TabsContent>

        {/* Scheduling Phase */}
        <TabsContent value="scheduling" className="space-y-4">
          <SchedulingPhase event={event} onUpdate={setEvent} onFinalize={handleFinalizeDate} />
          
          {/* Finalize Button Area (Moved inside SchedulingPhase usually, but if we need finalize logic here...) 
              Actually, SchedulingPhase component handles voting and adding dates. 
              The 'finalize' logic (choosing the final date) is typically an owner action.
              My SchedulingPhase implementation doesn't have a 'finalize' button for the owner yet.
              I should add it there or here. 
              
              Looking at my SchedulingPhase code, it doesn't have Finalize buttons.
              I should probably add the "Finalize" button logic *here* below the SchedulingPhase component 
              or pass `onFinalize` to `SchedulingPhase`.
              
              Let's add it here for now to keep SchedulingPhase focused on the list.
          */}
          {canAdvance && event.dateOptions.length > 0 && isCreator && (
             <Card className="bg-primary/10 border-primary/20 rounded-2xl mt-6 hidden">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-3 font-medium">
                    Event-Termin final festlegen:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {event.dateOptions.map((opt) => (
                      <Button 
                        key={opt.id}
                        variant="secondary"
                        onClick={() => handleFinalizeDate(opt.id)}
                        className="rounded-xl"
                        disabled={actionLoading}
                      >
                        {new Date(opt.date).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                        {opt.startTime && ` (${opt.startTime})`}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
          )}
        </TabsContent>

        {/* Info Phase */}
        <TabsContent value="info" className="space-y-6">
          <Card className="bg-success/10 border-success/20 rounded-2xl">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Event steht fest!</h3>
              <p className="text-muted-foreground">
                Hier sind die finalen Details.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Activity */}
            {chosenActivity && (
              <Card className="rounded-2xl overflow-hidden h-full flex flex-col">
                <div className="h-48 w-full relative">
                  <img 
                    src={chosenActivity.imageUrl} 
                    alt={chosenActivity.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="backdrop-blur-md bg-background/80">
                      {CategoryLabels[chosenActivity.category]}
                    </Badge>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl">{chosenActivity.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                  <p className="text-muted-foreground">{chosenActivity.shortDescription}</p>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Euro className="h-4 w-4" />
                      <span>~{chosenActivity.estPricePerPerson}€ p.P.</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{chosenActivity.duration}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground col-span-2">
                      <MapPin className="h-4 w-4" />
                      <span>{RegionLabels[chosenActivity.locationRegion]} {chosenActivity.locationCity && `• ${chosenActivity.locationCity}`}</span>
                    </div>
                    {typeof chosenActivity.maxCapacity === "number" && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground col-span-2">
                        <Users className="h-4 w-4" />
                        <span>Max. {chosenActivity.maxCapacity} Personen</span>
                      </div>
                    )}
                    {chosenActivity.outdoorSeating !== undefined && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground col-span-2">
                        <CloudSun className="h-4 w-4" />
                        <span>{chosenActivity.outdoorSeating ? "Sitzplätze im Freien verfügbar" : "Keine Sitzplätze im Freien"}</span>
                      </div>
                    )}
                  </div>

                  {(chosenActivity.website || chosenActivity.reservationUrl || chosenActivity.menuUrl || chosenActivity.facebook || chosenActivity.instagram) && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {chosenActivity.website && (
                        <Button variant="outline" className="rounded-xl gap-2" asChild>
                          <a href={chosenActivity.website} target="_blank" rel="noopener noreferrer">
                            <Globe className="h-4 w-4" />
                            Webseite
                          </a>
                        </Button>
                      )}
                      {chosenActivity.reservationUrl && (
                        <Button variant="outline" className="rounded-xl gap-2" asChild>
                          <a href={chosenActivity.reservationUrl} target="_blank" rel="noopener noreferrer">
                            <Calendar className="h-4 w-4" />
                            Reservierung
                          </a>
                        </Button>
                      )}
                      {chosenActivity.menuUrl && (
                        <Button variant="outline" className="rounded-xl gap-2" asChild>
                          <a href={chosenActivity.menuUrl} target="_blank" rel="noopener noreferrer">
                            <BookOpen className="h-4 w-4" />
                            Speisekarte
                          </a>
                        </Button>
                      )}
                      {chosenActivity.facebook && (
                        <Button variant="outline" className="rounded-xl gap-2" asChild>
                          <a href={chosenActivity.facebook} target="_blank" rel="noopener noreferrer">
                            <Facebook className="h-4 w-4" />
                            Facebook
                          </a>
                        </Button>
                      )}
                      {chosenActivity.instagram && (
                        <Button variant="outline" className="rounded-xl gap-2" asChild>
                          <a href={chosenActivity.instagram} target="_blank" rel="noopener noreferrer">
                            <Instagram className="h-4 w-4" />
                            Instagram
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Date */}
            {finalDateOption && (
              <Card className="rounded-2xl h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Termin
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center items-center text-center p-8">
                  <div className="mb-4 p-4 bg-primary/10 rounded-2xl text-primary">
                    <span className="text-4xl font-bold block">
                      {new Date(finalDateOption.date).getDate()}
                    </span>
                    <span className="text-lg uppercase font-medium tracking-wide">
                      {new Date(finalDateOption.date).toLocaleDateString("de-DE", { month: "short" })}
                    </span>
                  </div>
                  
                  <h4 className="text-2xl font-semibold mb-2">
                    {new Date(finalDateOption.date).toLocaleDateString("de-DE", { weekday: "long" })}
                  </h4>
                  
                  <p className="text-muted-foreground text-lg">
                    {new Date(finalDateOption.date).toLocaleDateString("de-DE", { year: "numeric" })}
                  </p>

                  {(finalDateOption.startTime) && (
                    <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-secondary rounded-full">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {finalDateOption.startTime}
                        {finalDateOption.endTime && ` – ${finalDateOption.endTime}`} Uhr
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Participants */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Teilnehmer ({event.participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {event.participants.map((participant) => (
                  <div
                    key={participant.userId}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors",
                      participant.dateResponse === "yes" 
                        ? "bg-success/5 border-success/20 text-success-foreground"
                        : participant.dateResponse === "maybe"
                        ? "bg-warning/5 border-warning/20 text-warning-foreground"
                        : participant.dateResponse === "no"
                        ? "bg-destructive/5 border-destructive/20 text-muted-foreground opacity-50 line-through decoration-destructive/50"
                        : "bg-secondary/50 border-transparent text-muted-foreground"
                    )}
                  >
                    <span className="text-sm font-medium">{participant.userName}</span>
                    {participant.isOrganizer && (
                      <Badge variant="outline" className="text-[10px] h-5">Org</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
