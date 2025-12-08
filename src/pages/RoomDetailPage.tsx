import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Calendar, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/PageHeader";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { getRoomById, getEventsByRoom } from "@/services/apiClient";
import type { Room, Event } from "@/types/domain";

export default function RoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!roomId) return;
      const [roomResult, eventsResult] = await Promise.all([
        getRoomById(roomId),
        getEventsByRoom(roomId),
      ]);
      setRoom(roomResult.data);
      setEvents(eventsResult.data);
      setLoading(false);
    };
    fetchData();
  }, [roomId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary/30 rounded animate-pulse" />
        <div className="h-32 bg-secondary/30 rounded-2xl animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-secondary/30 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <EmptyState
        icon={Users}
        title="Raum nicht gefunden"
        description="Der gesuchte Raum existiert nicht oder wurde gelöscht."
        action={
          <Button onClick={() => navigate("/rooms")} className="rounded-xl">
            Zurück zu Räumen
          </Button>
        }
      />
    );
  }

  const activeEvents = events.filter((e) => e.phase !== "info");
  const pastEvents = events.filter((e) => e.phase === "info");

  return (
    <div>
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 mb-4 -ml-2"
        onClick={() => navigate("/rooms")}
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Räumen
      </Button>

      {/* Room Header */}
      <div className="flex items-start gap-6 mb-8">
        <Avatar className="h-20 w-20 rounded-2xl ring-2 ring-border">
          <AvatarImage src={room.avatarUrl} className="object-cover" />
          <AvatarFallback className="rounded-2xl text-2xl font-semibold bg-secondary">
            {room.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{room.name}</h1>
          {room.description && (
            <p className="text-muted-foreground mt-1">{room.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{room.memberCount} Mitglieder</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{events.length} Events</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="icon" className="rounded-xl">
            <Settings className="h-4 w-4" />
          </Button>
          <Button 
            className="gap-2 rounded-xl"
            onClick={() => navigate(`/rooms/${roomId}/events/new`)}
          >
            <Plus className="h-4 w-4" />
            Event erstellen
          </Button>
        </div>
      </div>

      {/* Events Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="bg-secondary/50 rounded-xl p-1">
          <TabsTrigger value="active" className="rounded-lg">
            Aktive Events ({activeEvents.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="rounded-lg">
            Vergangene Events ({pastEvents.length})
          </TabsTrigger>
          <TabsTrigger value="members" className="rounded-lg">
            Mitglieder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeEvents.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Keine aktiven Events"
              description="Erstelle ein neues Event, um loszulegen!"
              action={
                <Button 
                  className="gap-2 rounded-xl"
                  onClick={() => navigate(`/rooms/${roomId}/events/new`)}
                >
                  <Plus className="h-4 w-4" />
                  Event erstellen
                </Button>
              }
            />
          ) : (
            activeEvents.map((event, index) => (
              <div
                key={event.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <EventCard
                  event={event}
                  onClick={() => navigate(`/rooms/${roomId}/events/${event.id}`)}
                />
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastEvents.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Keine vergangenen Events"
              description="Hier werden abgeschlossene Events angezeigt."
            />
          ) : (
            pastEvents.map((event, index) => (
              <div
                key={event.id}
                className="animate-fade-in-up opacity-70"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <EventCard
                  event={event}
                  onClick={() => navigate(`/rooms/${roomId}/events/${event.id}`)}
                />
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="members">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {room.members?.map((member, index) => (
              <div
                key={member.userId}
                className="flex items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/50 animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatarUrl} />
                  <AvatarFallback>{member.userName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{member.userName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                </div>
              </div>
            )) || (
              <p className="text-muted-foreground col-span-full text-center py-8">
                Mitgliederliste nicht verfügbar
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
