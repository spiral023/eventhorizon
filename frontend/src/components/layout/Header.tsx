import { useState } from "react";
import { Search, Bell, User, LogOut, Menu, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarContent } from "@/components/layout/Sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/authStore";

export function Header() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const initials = (user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "");

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 h-16 glass border-b border-border/50">
      <div className="flex h-full items-center justify-between px-6">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Navigation öffnen"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[85vw] max-w-sm overflow-y-auto">
              <SheetHeader className="px-4 pt-4 pb-2 text-left">
                <SheetTitle>Menü</SheetTitle>
              </SheetHeader>
              <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
            <div className="h-5 w-5 rounded-md bg-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Event<span className="text-primary">Horizon</span>
          </span>
        </div>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Räume, Aktivitäten, Events durchsuchen..."
              className="w-full pl-10 bg-secondary/50 border-border/50 focus:bg-secondary/80 transition-colors"
              aria-label="Suche"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative" aria-label="Benachrichtigungen">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
          </Button>
          
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-transparent hover:ring-primary/50 transition-all">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs font-semibold uppercase">
                    {initials || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.name || "Benutzer"}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {user?.email || ""}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  Einstellungen
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="hidden sm:inline-flex"
                onClick={() => navigate("/login")}
              >
                Anmelden
              </Button>
              <Button
                variant="outline"
                className="gap-2 rounded-full pl-2 pr-3"
                onClick={() => navigate("/login?mode=register")}
              >
                <Avatar className="h-7 w-7 ring-2 ring-transparent">
                  <AvatarFallback className="text-[10px] font-semibold uppercase">
                    <UserPlus className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span>Registrieren</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
