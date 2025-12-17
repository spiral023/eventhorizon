import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Calendar, Users, Link2, Trash2, LogOut } from "lucide-react";
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
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ShareRoomDialog } from "@/components/shared/ShareRoomDialog";
import { EditRoomDialog } from "@/components/shared/EditRoomDialog";
import { getRoomByAccessCode, getEventsByAccessCode, deleteEvent, getRoomMembers, leaveRoom, type RoomMember } from "@/services/apiClient";
import type { Room, Event } from "@/types/domain";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

export default function RoomDetailPage() {
  const { accessCode } = useParams<{ accessCode: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogEvent, setDeleteDialogEvent] = useState<Event | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchData = async () => {
      if (!accessCode) return;
      
      try {
        // 1. Fetch Room (by ID or Invite Code)
        const roomResult = await getRoomByAccessCode(accessCode);
        if (roomResult.error || !roomResult.data) {
          setLoading(false);
          return; // or handle error state
        }
        
        const roomData = roomResult.data;
        setRoom(roomData);

        // 2. Fetch details using the resolved real UUID
        const [eventsResult, membersResult] = await Promise.all([
          getEventsByAccessCode(accessCode),
          getRoomMembers(accessCode),
        ]);

        setEvents(eventsResult.data || []);
        setMembers(membersResult.data || []);
      } catch (error) {
        console.error("Failed to load room data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [accessCode]);

  const handleRoomUpdated = (updatedRoom: Room) => {
    setRoom(updatedRoom);
  };

  const handleDeleteEvent = async () => {
    if (!deleteDialogEvent) return;
    const eventCode = deleteDialogEvent.shortCode || deleteDialogEvent.id;
    setDeleteLoading(true);
    try {
      const result = await deleteEvent(eventCode);
      if (result.error) {
        toast.error(result.error.message || "Fehler beim Löschen des Events");
        return;
      }
      setEvents((prev) => prev.filter((e) => (e.shortCode || e.id) !== eventCode));
      toast.success("Event erfolgreich gelöscht!");
      setDeleteDialogEvent(null);
    } catch {
      toast.error("Fehler beim Löschen des Events");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!room) return;
    setLeaveLoading(true);
    try {
      const result = await leaveRoom(accessCode!);
      if (result.error) {
        toast.error(result.error.message || "Fehler beim Verlassen des Raums");
        return;
      }
      toast.success("Raum verlassen");
      navigate("/rooms");
    } catch {
      toast.error("Fehler beim Verlassen des Raums");
    } finally {
      setLeaveLoading(false);
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
    <div className="space-y-6 pb-16">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 -ml-2 w-full sm:w-auto justify-start"
        onClick={() => navigate("/rooms")}
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Räumen
      </Button>

      {/* Room Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <Avatar className="h-16 w-16 lg:h-20 lg:w-20 rounded-2xl ring-2 ring-border">
          <AvatarImage src={room.avatarUrl} className="object-cover" />
          <AvatarFallback className="rounded-2xl text-2xl font-semibold bg-secondary">
            {room.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight break-words">{room.name}</h1>
          {room.description && (
            <p className="text-muted-foreground text-sm lg:text-base">{room.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5 min-w-[140px]">
              <Users className="h-4 w-4" />
              <span>{room.memberCount} Mitglieder</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-[140px]">
              <Calendar className="h-4 w-4" />
              <span>{events.length} Events</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 flex-nowrap">
          <ShareRoomDialog
            room={room}
            trigger={
              <Button variant="outline" size="icon" className="rounded-xl shrink-0">
                <Link2 className="h-4 w-4" />
              </Button>
            }
          />
          <EditRoomDialog room={room} onRoomUpdated={handleRoomUpdated} />
          
          {user && room.createdByUserId !== user.id && (
            <Button
              variant="secondary"
              size="icon"
              className="rounded-xl shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setLeaveDialogOpen(true)}
              title="Raum verlassen"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}

          <Button 
            size="sm"
            className="gap-2 rounded-xl shrink-0 whitespace-nowrap"
            onClick={() => navigate(`/rooms/${accessCode}/events/new`)}
          >
            <Plus className="h-4 w-4" />
            Event erstellen
          </Button>
        </div>
      </div>

      {/* Events Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="bg-secondary/50 rounded-xl p-1 flex flex-wrap gap-2 w-full overflow-x-auto">
          <TabsTrigger value="active" className="rounded-lg flex-1 min-w-[160px]">
            Aktive Events ({activeEvents.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="rounded-lg flex-1 min-w-[160px]">
            Vergangene Events ({pastEvents.length})
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
                  onClick={() => navigate(`/rooms/${accessCode}/events/new`)}
                >
                  <Plus className="h-4 w-4" />
                  Event erstellen
                </Button>
              }
            />
          ) : (
            activeEvents.map((event, index) => (
              <div
                key={`active-event-${event.id}`}
                className="animate-fade-in-up relative"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <EventCard
                  event={event}
                  actionSlot={user?.id && event.createdByUserId === user.id ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteDialogEvent(event);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : undefined}
                  onClick={() => navigate(`/rooms/${accessCode}/events/${event.shortCode || event.id}`)}
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
                key={`past-event-${event.id}`}
                className="animate-fade-in-up opacity-70 relative"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <EventCard
                  event={event}
                  actionSlot={user?.id && event.createdByUserId === user.id ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteDialogEvent(event);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : undefined}
                  onClick={() => navigate(`/rooms/${accessCode}/events/${event.shortCode || event.id}`)}
                />
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Members list (moved outside tabs for mobile friendliness) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Mitglieder</h2>
          <span className="text-sm text-muted-foreground">{members.length}</span>
        </div>
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
                key={`member-${member.id}`}
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
      </div>

      <AlertDialog open={!!deleteDialogEvent} onOpenChange={(open) => !open && setDeleteDialogEvent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Event löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieses Event und alle zugehörigen Daten werden dauerhaft gelöscht. "{deleteDialogEvent?.name}" wirklich entfernen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteEvent}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Lösche..." : "Event löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Raum verlassen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du den Raum "{room.name}" wirklich verlassen? Du hast dann keinen Zugriff mehr auf Events und Diskussionen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleLeaveRoom}
              disabled={leaveLoading}
            >
              {leaveLoading ? "Verlasse..." : "Raum verlassen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
