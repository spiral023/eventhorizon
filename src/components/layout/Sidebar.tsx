import { useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  Users, 
  Compass, 
  User, 
  Map, 
  Calendar, 
  Settings, 
  LogOut,
  Sparkles,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuthStore } from "@/stores/authStore";
import { getRooms, getEventsByRoom } from "@/services/apiClient";
import type { Room, Event } from "@/types/domain";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

const staticNavItems: NavItem[] = [
  { label: "Übersicht", to: "/", icon: Home },
  { label: "Aktivitäten", to: "/activities", icon: Compass },
  { label: "Team-Analyse", to: "/team", icon: Sparkles },
  { label: "Karte", to: "/map", icon: Map },
];

const bottomNavItems: NavItem[] = [
  { label: "Profil", to: "/profile", icon: User },
  { label: "Einstellungen", to: "/settings", icon: Settings },
];

function NavItemComponent({ item }: { item: NavItem }) {
  const Icon = item.icon;
  
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium",
        "text-muted-foreground hover:text-foreground hover:bg-secondary/80",
        "transition-all duration-200"
      )}
      activeClassName="bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
    >
      <Icon className="h-5 w-5" />
      <span>{item.label}</span>
    </NavLink>
  );
}

interface RoomWithEvents {
  room: Room;
  activeEvents: Event[];
}

function RoomsNavSection() {
  const location = useLocation();
  const [roomsWithEvents, setRoomsWithEvents] = useState<RoomWithEvents[]>([]);
  const [isRoomsOpen, setIsRoomsOpen] = useState(true);
  const [openRoomIds, setOpenRoomIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchRoomsAndEvents = async () => {
      const roomsResult = await getRooms();
      const roomsData = roomsResult.data;

      const roomsWithEventsData = await Promise.all(
        roomsData.map(async (room) => {
          const eventsResult = await getEventsByRoom(room.id);
          const activeEvents = eventsResult.data.filter(
            (e) => e.phase !== "info"
          );
          return { room, activeEvents };
        })
      );

      setRoomsWithEvents(roomsWithEventsData);

      // Auto-expand room if currently viewing it
      const currentRoomMatch = location.pathname.match(/\/rooms\/([^/]+)/);
      if (currentRoomMatch) {
        setOpenRoomIds((prev) => new Set([...prev, currentRoomMatch[1]]));
      }
    };

    fetchRoomsAndEvents();
  }, [location.pathname]);

  const toggleRoom = (roomId: string) => {
    setOpenRoomIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(roomId)) {
        newSet.delete(roomId);
      } else {
        newSet.add(roomId);
      }
      return newSet;
    });
  };

  const isRoomActive = (roomId: string) => 
    location.pathname === `/rooms/${roomId}` || 
    location.pathname.startsWith(`/rooms/${roomId}/`);

  const isEventActive = (roomId: string, eventId: string) =>
    location.pathname === `/rooms/${roomId}/events/${eventId}`;

  return (
    <Collapsible open={isRoomsOpen} onOpenChange={setIsRoomsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium w-full",
            "text-muted-foreground hover:text-foreground hover:bg-secondary/80",
            "transition-all duration-200"
          )}
        >
          <Users className="h-5 w-5" />
          <span className="flex-1 text-left">Räume</span>
          {isRoomsOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 space-y-0.5 mt-1">
        <NavLink
          to="/rooms"
          end
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
            "text-muted-foreground/70 hover:text-foreground hover:bg-secondary/60",
            "transition-all duration-200 italic"
          )}
          activeClassName="bg-primary/10 text-primary not-italic"
        >
          Alle Räume anzeigen
        </NavLink>
        {roomsWithEvents.map(({ room, activeEvents }) => (
          <div key={room.id}>
            {activeEvents.length > 0 ? (
              <Collapsible
                open={openRoomIds.has(room.id)}
                onOpenChange={() => toggleRoom(room.id)}
              >
                <div className="flex items-center">
                  <NavLink
                    to={`/rooms/${room.id}`}
                    className={cn(
                      "flex-1 flex items-center gap-2 px-3 py-2 rounded-l-lg text-sm",
                      "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                      "transition-all duration-200",
                      isRoomActive(room.id) && "bg-primary/10 text-primary"
                    )}
                  >
                    <span className="truncate">{room.name}</span>
                    <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                      {activeEvents.length}
                    </span>
                  </NavLink>
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "p-2 rounded-r-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                        "transition-all duration-200"
                      )}
                    >
                      {openRoomIds.has(room.id) ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="pl-4 space-y-0.5 mt-0.5">
                  {activeEvents.map((event) => (
                    <NavLink
                      key={event.id}
                      to={`/rooms/${room.id}/events/${event.id}`}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
                        "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                        "transition-all duration-200",
                        isEventActive(room.id, event.id) && "bg-primary/10 text-primary"
                      )}
                    >
                      <Calendar className="h-3 w-3" />
                      <span className="truncate">{event.name}</span>
                    </NavLink>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <NavLink
                to={`/rooms/${room.id}`}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                  "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                  "transition-all duration-200",
                  isRoomActive(room.id) && "bg-primary/10 text-primary"
                )}
              >
                <span className="truncate">{room.name}</span>
              </NavLink>
            )}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function Sidebar() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-border/50 bg-sidebar/50 backdrop-blur-sm overflow-y-auto">
      <div className="flex h-full flex-col p-4">
        {/* Main Navigation */}
        <nav className="flex-1 space-y-1">
          <div className="mb-4">
            <span className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
              Navigation
            </span>
          </div>
          <NavItemComponent item={staticNavItems[0]} />
          
          {/* Rooms with nested events */}
          <RoomsNavSection />
          
          {/* Other nav items */}
          {staticNavItems.slice(1).map((item) => (
            <NavItemComponent key={item.to} item={item} />
          ))}
        </nav>

        {/* Bottom Navigation */}
        <nav className="space-y-1 border-t border-border/50 pt-4">
          {bottomNavItems.map((item) => (
            <NavItemComponent key={item.to} item={item} />
          ))}
          
          {/* Logout Button */}
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 px-4 py-2.5 h-auto rounded-xl text-sm font-medium",
              "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span>Abmelden</span>
          </Button>
        </nav>
      </div>
    </aside>
  );
}
