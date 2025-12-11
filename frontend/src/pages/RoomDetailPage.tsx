import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Calendar, Users, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { PageHeader } from "@/components/shared/PageHeader";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ShareRoomDialog } from "@/components/shared/ShareRoomDialog";
import { EditRoomDialog } from "@/components/shared/EditRoomDialog";
import { getRoomById, getEventsByRoom, deleteEvent, getRoomMembers, type RoomMember } from "@/services/apiClient";
import type { Room, Event } from "@/types/domain";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

export default function RoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogEvent, setDeleteDialogEvent] = useState<Event | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchData = async () => {
      if (!roomId) return;
      const [roomResult, eventsResult, membersResult] = await Promise.all([
        getRoomById(roomId),
        getEventsByRoom(roomId),
        getRoomMembers(roomId),
      ]);
      setRoom(roomResult.data);
      setEvents(eventsResult.data);
      setMembers(membersResult.data || []);
      setLoading(false);
    };
    fetchData();
  }, [roomId]);

  const handleRoomUpdated = (updatedRoom: Room) => {
    setRoom(updatedRoom);
  };

  const handleDeleteEvent = async () => {
    if (!deleteDialogEvent) return;
    setDeleteLoading(true);
    try {
      const result = await deleteEvent(deleteDialogEvent.id);
      if (result.error) {
        toast.error(result.error.message || "Fehler beim LÃ‡Ã´schen des Events");
        return;
      }
      setEvents((prev) => prev.filter((e) => e.id !== deleteDialogEvent.id));
      toast.success("Event erfolgreich gelÃ‡Ã´scht!");
      setDeleteDialogEvent(null);
    } catch {
      toast.error("Fehler beim LÃ‡Ã´schen des Events");
    } finally {
      setDeleteLoading(false);
    }
  };

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
        description="Der gesuchte Raum existiert nicht oder wurde gelÃ¶scht."
        action={
          <Button onClick={() => navigate("/rooms")} className="rounded-xl">
            ZurÃ¼ck zu RÃ¤umen
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
        ZurÃ¼ck zu RÃ¤umen
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
          <ShareRoomDialog
            room={room}
            trigger={
              <Button variant="outline" size="icon" className="rounded-xl">
                <Link2 className="h-4 w-4" />
              </Button>
            }
          />
          <EditRoomDialog room={room} onRoomUpdated={handleRoomUpdated} />
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
                className="animate-fade-in-up relative"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {user?.id && event.createdByUserId === user.id && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteDialogEvent(event);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
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
                className="animate-fade-in-up opacity-70 relative"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {user?.id && event.createdByUserId === user.id && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteDialogEvent(event);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <EventCard
                  event={event}
                  onClick={() => navigate(`/rooms/${roomId}/events/${event.id}`)}
                />
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="members">
          {members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Keine Mitglieder"
              description="Lade Mitglieder ein, um gemeinsam Events zu planen."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member, index) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/50 animate-fade-in-up hover:bg-card/80 transition-colors"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatarUrl} />
                    <AvatarFallback className="text-lg font-semibold">
                      {member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{member.username}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                        {member.role}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteDialogEvent} onOpenChange={(open) => !open && setDeleteDialogEvent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Event lÃ‡Ã´schen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieses Event und alle zugehÃ‡Ã´rigen Daten werden dauerhaft gelÃ‡Ã´scht. "{deleteDialogEvent?.name}" wirklich entfernen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteEvent}
              disabled={deleteLoading}
            >
              {deleteLoading ? "LÃ‡Ã´sche..." : "Event lÃ‡Ã´schen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
