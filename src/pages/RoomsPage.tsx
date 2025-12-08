import { useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoomCard } from "@/components/shared/RoomCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { getRooms } from "@/services/apiClient";
import type { Room } from "@/types/domain";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      const result = await getRooms();
      setRooms(result.data);
      setLoading(false);
    };
    fetchRooms();
  }, []);

  return (
    <div>
      <PageHeader
        title="Deine Räume"
        description="Verwalte deine Teams und Firmenräume. Jeder Raum ist ein eigener Bereich für gemeinsame Event-Planung."
        action={
          <Button className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            Neuer Raum
          </Button>
        }
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
          action={
            <Button className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Raum erstellen
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rooms.map((room, index) => (
            <div
              key={room.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <RoomCard room={room} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
