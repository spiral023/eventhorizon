import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { 
  Home, 
  Users, 
  Compass, 
  User, 
  Map, 
  Calendar, 
  Settings, 
  LogOut,
  Sparkles 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { label: "Übersicht", to: "/", icon: Home },
  { label: "Räume", to: "/rooms", icon: Users },
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

export function Sidebar() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-border/50 bg-sidebar/50 backdrop-blur-sm">
      <div className="flex h-full flex-col p-4">
        {/* Main Navigation */}
        <nav className="flex-1 space-y-1">
          <div className="mb-4">
            <span className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
              Navigation
            </span>
          </div>
          {mainNavItems.map((item) => (
            <NavItemComponent key={item.to} item={item} />
          ))}
        </nav>

        {/* Upcoming Events Preview */}
        <div className="mb-4 rounded-2xl bg-secondary/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nächstes Event
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Sommer-Teamevent</p>
            <p className="text-xs text-muted-foreground">Juli 2024</p>
          </div>
        </div>

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
