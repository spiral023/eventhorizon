import * as React from "react";
import {
  Calendar,
  CreditCard,
  Calculator,
  Settings,
  Smile,
  User,
  Search,
  Zap,
  Users,
  Building,
  CalendarCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { DialogProps } from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { searchGlobal, SearchResult } from "@/services/apiClient";
import { useDebounce } from "@/hooks/use-debounce"; // Assuming this hook exists or I'll implement a simple one

export function GlobalSearch({ ...props }: DialogProps) {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const debouncedQuery = useDebounce(query, 300);

  React.useEffect(() => {
    async function fetchResults() {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setResults(null);
        return;
      }
      setLoading(true);
      try {
        const { data } = await searchGlobal(debouncedQuery);
        if (data) {
          setResults(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [debouncedQuery]);

  const handleSelect = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative h-10 w-full justify-start rounded-[0.5rem] bg-secondary/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64 xl:w-80",
        )}
        onClick={() => setOpen(true)}
      >
        <span className="inline-flex">
          <Search className="mr-2 h-4 w-4" />
          Suche...
        </span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Tippe, um zu suchen..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {!loading && !results && <CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>}
          {loading && <CommandEmpty>Suche...</CommandEmpty>}
          
          {results?.activities?.length ? (
            <CommandGroup heading="Aktivitäten">
              {results.activities.map((activity) => (
                <CommandItem
                  key={activity.id}
                  value={activity.title} // Used for filtering, but we handle it via API
                  onSelect={() => handleSelect(() => navigate(`/activities/${activity.id}`))}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  <span>{activity.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          
          {results?.rooms?.length ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Räume">
                {results.rooms.map((room) => (
                  <CommandItem
                    key={room.id}
                    value={room.name}
                    onSelect={() => handleSelect(() => navigate(`/rooms/${room.id}`))}
                  >
                    <Building className="mr-2 h-4 w-4" />
                    <span>{room.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {results?.events?.length ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Events">
                {results.events.map((event) => (
                  <CommandItem
                    key={event.id}
                    value={event.name}
                    onSelect={() => handleSelect(() => navigate(`/rooms/${event.roomId}/events/${event.id}`))}
                  >
                    <CalendarCheck className="mr-2 h-4 w-4" />
                    <span>{event.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {results?.users?.length ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Personen">
                {results.users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.name}
                    // onSelect={() => handleSelect(() => navigate(`/profile/${user.id}`))} // No public profile page yet?
                    onSelect={() => handleSelect(() => {})} // Just close for now or navigate to team
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>{user.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
