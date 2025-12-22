import { useEffect, useState } from "react";
import { Users, LogIn, Plus, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoomCard, RoomCardSkeleton } from "@/components/shared/RoomCard";
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
    <div className="flex items-center gap-2">
      <JoinRoomDialog
        trigger={
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl"
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Raum beitreten</span>
            <span className="sm:hidden">Beitreten</span>
          </Button>
        }
      />
      <CreateRoomDialog
        onRoomCreated={handleRoomCreated}
        trigger={
          <Button size="sm" className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Neuer Raum</span>
            <span className="sm:hidden">Neu</span>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <RoomCardSkeleton key={i} />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Noch keine Räume"
          description="Erstelle deinen ersten Raum oder tritt einem bestehenden bei, um mit der Event-Planung zu starten."
          action={
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <JoinRoomDialog
                trigger={
                  <Button variant="outline" className="gap-2 rounded-xl w-full sm:w-auto">
                    <LogIn className="h-4 w-4" />
                    Bestehendem Raum beitreten
                  </Button>
                }
              />
              <CreateRoomDialog
                onRoomCreated={handleRoomCreated}
                trigger={
                  <Button className="gap-2 rounded-xl w-full sm:w-auto">
                    <Sparkles className="h-4 w-4" />
                    Ersten Raum erstellen
                  </Button>
                }
              />
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room, index) => (
            <div
              key={room.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <RoomCard
                room={room}
                onClick={() => navigate(`/rooms/${room.inviteCode}`)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Mobile Floating Action Button */}
      <div className="fixed bottom-20 right-4 sm:hidden z-40">
        <CreateRoomDialog
          onRoomCreated={handleRoomCreated}
          trigger={
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-shadow duration-300"
              aria-label="Neuen Raum erstellen"
            >
              <Plus className="h-6 w-6" />
            </Button>
          }
        />
      </div>
    </div>
  );
}
