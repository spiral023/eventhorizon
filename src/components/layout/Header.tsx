import { Search, Bell, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
  return (
    <header className="sticky top-0 z-50 h-16 glass border-b border-border/50">
      <div className="flex h-full items-center justify-between px-6">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
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
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
          </Button>
          <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-transparent hover:ring-primary/50 transition-all">
            <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
