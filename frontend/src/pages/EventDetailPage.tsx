import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Euro, Users, Calendar, Clock, CheckCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventPhaseHeader } from "@/components/events/EventPhaseHeader";
import { VotingCard } from "@/components/events/VotingCard";
import { DateOptionCard } from "@/components/events/DateOptionCard";
import { EmailActions } from "@/components/events/EmailActions";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddDateOptionDialog } from "@/components/events/AddDateOptionDialog";
import { 
  getEventById, 
  getActivities, 
  voteOnActivity, 
  respondToDateOption,
  updateEventPhase,
  selectWinningActivity,
  finalizeDateOption
} from "@/services/apiClient";
import type { Event, Activity, VoteType, DateResponseType, EventPhase, DateOption } from "@/types/domain";
import { 
  PhaseLabels, 
  RegionLabels, 
  formatTimeWindow, 
  formatBudget,
  CategoryLabels
} from "@/types/domain";
import { canTransition, getNextPhases } from "@/utils/phaseStateMachine";
import { cn } from "@/lib/utils";

export default function EventDetailPage() {
  const { roomId, eventId } = useParams<{ roomId: string; eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const currentUserId = "user-current"; // Mock current user

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      const [eventResult, activitiesResult] = await Promise.all([
        getEventById(eventId),
        getActivities(),
      ]);
      setEvent(eventResult.data);
      setActivities(activitiesResult.data);
      setLoading(false);
    };
    fetchData();
  }, [eventId]);

  const handleVote = async (activityId: string, vote: VoteType) => {
    if (!eventId) return;
    setActionLoading(true);
    const result = await voteOnActivity(eventId, activityId, vote);
    if (result.data) {
      setEvent(result.data);
    }
    setActionLoading(false);
  };

  const handleDateResponse = async (dateOptionId: string, response: DateResponseType, contribution?: number) => {
    if (!eventId) return;
    setActionLoading(true);
    const result = await respondToDateOption(eventId, dateOptionId, response, contribution);
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

  const chosenActivity = event.chosenActivityId 
    ? activities.find((a) => a.id === event.chosenActivityId)
    : null;

  const finalDateOption = event.finalDateOptionId
    ? event.dateOptions.find((d) => d.id === event.finalDateOptionId)
    : null;

  // Sort activities by vote score
  const sortedActivities = [...proposedActivities].sort((a, b) => {
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
        canAdvance={canAdvance}
        onAdvance={handleAdvancePhase}
      />

      {/* Admin Actions */}
      <div className="grid gap-6 md:grid-cols-3">
        <EmailActions eventId={event.id} className="md:col-span-3" />
      </div>

      {/* Phase Content */}
      <Tabs value={event.phase} className="space-y-6">
        <TabsList className="bg-secondary/50 rounded-xl p-1">
          <TabsTrigger value="proposal" className="rounded-lg" disabled={event.phase !== "proposal"}>
            Vorschläge
          </TabsTrigger>
          <TabsTrigger value="voting" className="rounded-lg" disabled={event.phase !== "voting"}>
            Abstimmung
          </TabsTrigger>
          <TabsTrigger value="scheduling" className="rounded-lg" disabled={event.phase !== "scheduling"}>
            Terminfindung
          </TabsTrigger>
          <TabsTrigger value="info" className="rounded-lg" disabled={event.phase !== "info"}>
            Event-Info
          </TabsTrigger>
        </TabsList>

        {/* Proposal Phase */}
        <TabsContent value="proposal" className="space-y-4">
          <Card className="bg-card/60 border-border/50 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Vorgeschlagene Aktivitäten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {proposedActivities.map((activity) => (
                <div key={activity.id} className="p-4 rounded-xl bg-secondary/30 flex items-center gap-4">
                  <img 
                    src={activity.imageUrl} 
                    alt={activity.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{activity.title}</h4>
                    <p className="text-sm text-muted-foreground">{activity.shortDescription}</p>
                  </div>
                  <Badge>{CategoryLabels[activity.category]}</Badge>
                </div>
              ))}
              {canAdvance && (
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
          {sortedActivities.map((activity, index) => (
            <div
              key={activity.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <VotingCard
                activity={activity}
                votes={event.activityVotes.find((v) => v.activityId === activity.id)}
                currentUserId={currentUserId}
                onVote={handleVote}
                isLoading={actionLoading}
              />
            </div>
          ))}
          {canAdvance && sortedActivities.length > 0 && (
            <Card className="bg-primary/10 border-primary/20 rounded-2xl">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Gewinner auswählen und zur Terminfindung übergehen:
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleSelectActivity(sortedActivities[0].id)}
                    className="flex-1 rounded-xl"
                    disabled={actionLoading}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    "{sortedActivities[0].title}" auswählen
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Scheduling Phase */}
        <TabsContent value="scheduling" className="space-y-4">
          {chosenActivity && (
            <Card className="bg-primary/10 border-primary/20 rounded-2xl">
              <CardContent className="p-4 flex items-center gap-4">
                <img 
                  src={chosenActivity.imageUrl} 
                  alt={chosenActivity.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div>
                  <p className="text-sm text-primary font-medium">Ausgewählte Aktivität</p>
                  <h4 className="font-semibold text-lg">{chosenActivity.title}</h4>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-muted-foreground">
            Wähle deine verfügbaren Termine und gib optional einen Geldbeitrag an.
          </p>

          {event.dateOptions.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Noch keine Termine"
              description="Der Organisator muss erst Terminoptionen hinzufügen."
            />
          ) : (
            <div className="space-y-4">
              {event.dateOptions.map((dateOption, index) => (
                <div
                  key={dateOption.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <DateOptionCard
                    dateOption={dateOption}
                    currentUserId={currentUserId}
                    onRespond={handleDateResponse}
                    isLoading={actionLoading}
                    isFinal={dateOption.id === event.finalDateOptionId}
                  />
                </div>
              ))}

              {canAdvance && (
                <Card className="bg-primary/10 border-primary/20 rounded-2xl">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Termin finalisieren und Event abschließen:
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
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Info Phase */}
        <TabsContent value="info" className="space-y-6">
          <Card className="bg-success/10 border-success/20 rounded-2xl">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Event steht fest!</h3>
              <p className="text-muted-foreground">
                Alle Details auf einen Blick
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Activity */}
            {chosenActivity && (
              <Card className="bg-card/60 border-border/50 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Aktivität</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <img 
                      src={chosenActivity.imageUrl} 
                      alt={chosenActivity.title}
                      className="w-24 h-24 rounded-xl object-cover"
                    />
                    <div>
                      <h4 className="font-semibold text-lg">{chosenActivity.title}</h4>
                      <p className="text-sm text-muted-foreground">{chosenActivity.shortDescription}</p>
                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                        <span>{chosenActivity.duration}</span>
                        <span>·</span>
                        <span>{chosenActivity.estPricePerPerson}€ p.P.</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Date */}
            {finalDateOption && (
              <Card className="bg-card/60 border-border/50 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Termin</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 flex-col items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      <span className="text-2xl font-bold">
                        {new Date(finalDateOption.date).getDate()}
                      </span>
                      <span className="text-xs">
                        {new Date(finalDateOption.date).toLocaleDateString("de-DE", { month: "short" })}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {new Date(finalDateOption.date).toLocaleDateString("de-DE", { 
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric"
                        })}
                      </p>
                      {finalDateOption.startTime && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {finalDateOption.startTime}
                          {finalDateOption.endTime && ` – ${finalDateOption.endTime}`} Uhr
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Participants */}
          <Card className="bg-card/60 border-border/50 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Teilnehmer ({event.participants.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {event.participants.map((participant) => (
                  <div
                    key={participant.userId}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl",
                      participant.dateResponse === "yes" && "bg-success/10",
                      participant.dateResponse === "maybe" && "bg-warning/10",
                      participant.dateResponse === "no" && "bg-destructive/10",
                      !participant.dateResponse && "bg-secondary/50"
                    )}
                  >
                    <span className="text-sm font-medium">{participant.userName}</span>
                    {participant.isOrganizer && (
                      <Badge variant="outline" className="text-xs">Organisator</Badge>
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