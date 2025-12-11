import { useEffect, useState } from "react";
import { Users, LogIn, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoomCard } from "@/components/shared/RoomCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { CreateRoomDialog } from "@/components/shared/CreateRoomDialog";
import { JoinRoomDialog } from "@/components/shared/JoinRoomDialog";
import { Button } from "@/components/ui/button";
import { getRooms } from "@/services/apiClient";
import type { Room } from "@/types/domain";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchRooms = async () => {
    const result = await getRooms();
    setRooms(result.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleRoomCreated = (newRoom: Room) => {
    setRooms((prev) => [...prev, newRoom]);
  };

  const actionButtons = (
    <div className="flex w-full max-w-md flex-col gap-2">
      <JoinRoomDialog
        trigger={
          <Button
            variant="outline"
            className="w-full justify-center gap-2 rounded-xl"
          >
            <LogIn className="h-4 w-4" />
            Raum beitreten
          </Button>
        }
      />
      <CreateRoomDialog
        onRoomCreated={handleRoomCreated}
        trigger={
          <Button className="w-full justify-center gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            Neuer Raum
          </Button>
        }
      />
    </div>
  );

  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      <PageHeader
        title="Deine Räume"
        description="Verwalte deine Teams und Firmenräume. Jeder Raum ist ein eigener Bereich für gemeinsame Event-Planung."
        action={actionButtons}
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-secondary/30 animate-pulse"
            />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Noch keine Räume"
          description="Erstelle deinen ersten Raum, um mit der Event-Planung zu starten."
          action={<CreateRoomDialog onRoomCreated={handleRoomCreated} />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rooms.map((room, index) => (
            <div
              key={room.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <RoomCard
                room={room}
                onClick={() => navigate(`/rooms/${room.id}`)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="fixed bottom-5 right-5 sm:hidden">
        <CreateRoomDialog
          onRoomCreated={handleRoomCreated}
          trigger={
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg shadow-primary/30"
              aria-label="Neuen Raum erstellen"
            >
              <Plus className="h-5 w-5" />
            </Button>
          }
        />
      </div>
    </div>
  );
}
