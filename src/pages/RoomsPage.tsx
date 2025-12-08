import { useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoomCard } from "@/components/shared/RoomCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { CreateRoomDialog } from "@/components/shared/CreateRoomDialog";
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

  return (
    <div>
      <PageHeader
        title="Deine Räume"
        description="Verwalte deine Teams und Firmenräume. Jeder Raum ist ein eigener Bereich für gemeinsame Event-Planung."
        action={<CreateRoomDialog onRoomCreated={handleRoomCreated} />}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
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
        <div className="grid gap-4 sm:grid-cols-2">
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
    </div>
  );
}
