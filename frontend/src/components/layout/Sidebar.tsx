import { useCallback, useEffect, useState } from "react";

import { useNavigate, useLocation } from "react-router-dom";

import { NavLink } from "@/components/NavLink";

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

    ShieldCheck,

    ChevronRight,

    ChevronDown,

    Lock,
    Cake,
  } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";

import { getRooms, getEventsByAccessCode } from "@/services/apiClient";

import type { Room, Event } from "@/types/domain";

import { cn } from "@/lib/utils";

import { LegalNoticeDialog } from "@/components/shared/LegalNoticeDialog";
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

const sortRoomsByMembers = (input: Room[]) =>
  [...input].sort((a, b) => {
    const diff = (b.memberCount ?? 0) - (a.memberCount ?? 0);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, "de");
  });

interface NavItem {

  label: string;

  to: string;

  icon: React.ComponentType<{ className?: string }>;

}



const staticNavItems: NavItem[] = [
  { label: "Übersicht", to: "/", icon: Home },
  { label: "Aktivitäten", to: "/activities", icon: Compass },
  { label: "Geburtstage", to: "/birthdays", icon: Cake },
  { label: "Team-Analyse", to: "/team", icon: Sparkles },
  { label: "Karte", to: "/map", icon: Map },
];



const bottomNavItems: NavItem[] = [

  { label: "Profil", to: "/profile", icon: User },

  { label: "Einstellungen", to: "/settings", icon: Settings },

];



function NavItemComponent({
  item,
  onNavigate,
  locked,
  subtitle,
}: {
  item: NavItem;
  onNavigate?: (targetPath: string, event?: React.MouseEvent) => void;
  locked?: boolean;
  subtitle?: string;
}) {

  const Icon = item.icon;



  return (

    <NavLink

      to={item.to}

      end={item.to === "/"}

      className={cn(

        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium",

        "text-muted-foreground hover:text-foreground hover:bg-secondary/80",

        "transition-all duration-200",

        locked && "opacity-80"

      )}

      activeClassName="bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"

      onClick={(event) => onNavigate?.(item.to, event)}

      title={locked ? "Nur fÃ¼r angemeldete Nutzer" : undefined}

    >

      <Icon className="h-5 w-5" />

      <div className="flex flex-col text-left leading-tight">

        <span>{item.label}</span>

        {subtitle && (

          <span className="text-xs text-muted-foreground">{subtitle}</span>

        )}

      </div>

      {locked && <Lock className="h-4 w-4 ml-auto text-muted-foreground" />}

    </NavLink>

  );

}



interface RoomWithEvents {

  room: Room;

  activeEvents: Event[];

}



function RoomsNavSection({
  onNavigate,
}: {
  onNavigate?: (targetPath: string, event?: React.MouseEvent) => void;
}) {

  const location = useLocation();

  const { isAuthenticated } = useAuthStore();

  const [roomsWithEvents, setRoomsWithEvents] = useState<RoomWithEvents[]>([]);

  const [isRoomsOpen, setIsRoomsOpen] = useState(true);

  const [openRoomCodes, setOpenRoomCodes] = useState<Set<string>>(new Set());



  useEffect(() => {

    if (!isAuthenticated) {

      setRoomsWithEvents([]);

      return;

    }



    const fetchRoomsAndEvents = async () => {

      const roomsResult = await getRooms();

      const roomsData = roomsResult.data;



      if (!roomsData) {

        setRoomsWithEvents([]);

        return;

      }
      const sortedRooms = sortRoomsByMembers(roomsData);

      const roomsWithEventsData = await Promise.all(

        sortedRooms.map(async (room) => {

          const eventsResult = await getEventsByAccessCode(room.inviteCode);

          const allEvents = eventsResult.data || [];

          const activeEvents = allEvents.filter((e) => e.phase !== "info");

          return { room, activeEvents };

        })

      );

      setRoomsWithEvents(roomsWithEventsData);



      const currentRoomMatch = location.pathname.match(/\/rooms\/([^/]+)/);

      if (currentRoomMatch) {

        setOpenRoomCodes((prev) => new Set([...prev, currentRoomMatch[1]]));

      }

    };



    fetchRoomsAndEvents();

  }, [location.pathname, isAuthenticated]);



  const toggleRoom = (accessCode: string) => {

    setOpenRoomCodes((prev) => {

      const newSet = new Set(prev);

      if (newSet.has(accessCode)) {

        newSet.delete(accessCode);

      } else {

        newSet.add(accessCode);

      }

      return newSet;

    });

  };



  const isRoomActive = (accessCode: string) =>

    location.pathname === `/rooms/${accessCode}` ||

    location.pathname.startsWith(`/rooms/${accessCode}/`);



  const isEventActive = (accessCode: string, eventCode: string) =>

    location.pathname === `/rooms/${accessCode}/events/${eventCode}`;



  if (!isAuthenticated) {

    return (

      <NavItemComponent

        item={{ label: "Räume", to: "/rooms", icon: Users }}

        onNavigate={onNavigate}

        locked

        subtitle="Login erforderlich"

      />

    );

  }



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

          {isRoomsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}

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

          onClick={(event) => onNavigate?.("/rooms", event)}

        >

          Alle Räume anzeigen

        </NavLink>

        {roomsWithEvents.map(({ room, activeEvents }) => (

          <div key={room.id}>

            {activeEvents.length > 0 ? (

              <Collapsible open={openRoomCodes.has(room.inviteCode)} onOpenChange={() => toggleRoom(room.inviteCode)}>

                <div className="flex items-center">

                  <NavLink

                    to={`/rooms/${room.inviteCode}`}

                    className={cn(

                      "flex-1 flex items-center gap-2 px-3 py-2 rounded-l-lg text-sm",

                      "text-muted-foreground hover:text-foreground hover:bg-secondary/60",

                      "transition-all duration-200",

                      isRoomActive(room.inviteCode) && "bg-primary/10 text-primary"

                    )}

                    onClick={(event) => onNavigate?.(`/rooms/${room.inviteCode}`, event)}

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

                      {openRoomCodes.has(room.inviteCode) ? (

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

                      to={`/rooms/${room.inviteCode}/events/${event.shortCode || event.id}`}

                      className={cn(

                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",

                        "text-muted-foreground hover:text-foreground hover:bg-secondary/50",

                        "transition-all duration-200",

                        isEventActive(room.inviteCode, event.shortCode || event.id) && "bg-primary/10 text-primary"

                      )}

                      onClick={(event) =>
                        onNavigate?.(`/rooms/${room.inviteCode}/events/${event.shortCode || event.id}`, event)
                      }

                    >

                      <Calendar className="h-3 w-3" />

                      <span className="truncate">{event.name}</span>

                    </NavLink>

                  ))}

                </CollapsibleContent>

              </Collapsible>

            ) : (

              <NavLink

                to={`/rooms/${room.inviteCode}`}

                className={cn(

                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",

                  "text-muted-foreground hover:text-foreground hover:bg-secondary/60",

                  "transition-all duration-200",

                  isRoomActive(room.inviteCode) && "bg-primary/10 text-primary"

                )}

                onClick={(event) => onNavigate?.(`/rooms/${room.inviteCode}`, event)}

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



export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {

  const { logout, isAuthenticated, user } = useAuthStore();
  const completedByUserId = useOnboardingStore((state) => state.completedByUserId);
  const markComplete = useOnboardingStore((state) => state.markComplete);

  const navigate = useNavigate();
  const location = useLocation();
  const isOnboardingComplete = user ? !!completedByUserId[user.id] : true;
  const [isOnboardingDialogOpen, setIsOnboardingDialogOpen] = useState(false);
  const [pendingTargetPath, setPendingTargetPath] = useState<string | null>(null);

  const handleNavigate = useCallback(
    (targetPath: string, event?: React.MouseEvent) => {
      const isOnboardingRoute = location.pathname.startsWith("/onboarding");
      const shouldBlock = !!user && !isOnboardingComplete && isOnboardingRoute && targetPath !== "/onboarding";

      if (!shouldBlock) {
        onNavigate?.();
        return;
      }

      event?.preventDefault();
      setPendingTargetPath(targetPath);
      setIsOnboardingDialogOpen(true);
    },
    [isOnboardingComplete, location.pathname, onNavigate, user]
  );

  const handleSkipOnboarding = useCallback(() => {
    if (!user) {
      return;
    }
    markComplete(user.id);
    onNavigate?.();
    const nextPath = pendingTargetPath && pendingTargetPath !== "/onboarding"
      ? pendingTargetPath
      : "/activities";
    navigate(nextPath, { replace: true });
    setIsOnboardingDialogOpen(false);
  }, [markComplete, navigate, onNavigate, pendingTargetPath, user]);

  const handleLogout = async () => {

    await logout();

    onNavigate?.();

    navigate("/login");

  };



  return (

    <div className="flex h-full flex-col p-4">

      <nav className="flex-1 space-y-1">

        <div className="mb-4">

          <span className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">

            Navigation

          </span>

        </div>

        <NavItemComponent item={staticNavItems[0]} onNavigate={handleNavigate} />

        <RoomsNavSection onNavigate={handleNavigate} />

        {staticNavItems.slice(1).map((item) => (

          <NavItemComponent 

            key={item.to} 

            item={item} 

            onNavigate={handleNavigate} 

            locked={!isAuthenticated && item.to === "/team"}

            subtitle={!isAuthenticated && item.to === "/team" ? "Login erforderlich" : undefined}

          />

        ))}

      </nav>



      <nav className="space-y-1 border-t border-border/50 pt-4">

        {isAuthenticated ? (

          <>

                        <Button

                          variant="ghost"

                          className={cn(

                            "w-full justify-start gap-3 px-4 py-2.5 h-auto rounded-xl text-sm font-medium",

                            "text-muted-foreground hover:text-foreground hover:bg-secondary/80"

                          )}

                          onClick={() => {

                            onNavigate?.();

                            navigate("/onboarding", { state: { from: location } });

                          }}

                        >

                          <Sparkles className="h-5 w-5" />

                          <span>Einleitung</span>

                        </Button>

                        {bottomNavItems.map((item) => (

                          <NavItemComponent key={item.to} item={item} onNavigate={handleNavigate} />

                        ))}

                        <LegalNoticeDialog

                          trigger={

                            <Button

                              variant="ghost"

                              className={cn(

                                "w-full justify-start gap-3 px-4 py-2.5 h-auto rounded-xl text-sm font-medium",

                                "text-muted-foreground hover:text-foreground hover:bg-secondary/80"

                              )}

                            >

                              <ShieldCheck className="h-5 w-5" />

                              <span>Impressum</span>

                            </Button>

                          }

                        />

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

          </>

        ) : (

          <div className="px-2 space-y-2">

            <Button

              className="w-full justify-center rounded-xl"

              onClick={() => {

                onNavigate?.();

                navigate("/login");

              }}

            >

              Anmelden

            </Button>

            <Button

              variant="outline"

              className="w-full justify-center rounded-xl"

              onClick={() => {

                onNavigate?.();

                navigate("/login?mode=register");

              }}

            >

              Registrieren

            </Button>

          </div>

        )}

      </nav>

      <div className="mt-auto px-4 py-2 text-[10px] text-muted-foreground/40 text-center font-mono">
        v{import.meta.env.PACKAGE_VERSION}
      </div>

      <AlertDialog open={isOnboardingDialogOpen} onOpenChange={setIsOnboardingDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle>Onboarding zuerst abschließen</AlertDialogTitle>
            <AlertDialogDescription>
              Bitte beende das Onboarding. Du kannst es auch überspringen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-end">
            <AlertDialogCancel className="rounded-xl">Weiter im Onboarding</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" onClick={handleSkipOnboarding}>
              Onboarding überspringen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>

  );

}



export function Sidebar() {

  return (

    <aside className="hidden lg:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-border/50 bg-sidebar/50 backdrop-blur-sm overflow-y-auto">

      <SidebarContent />

    </aside>

  );

}
