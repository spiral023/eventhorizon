import React, { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { addDateOption } from "@/services/apiClient";
import type { Event } from "@/types/domain";

interface DateProposalProps {
  event: Event;
  onUpdate: (updatedEvent: Event) => void;
}

export const DateProposal: React.FC<DateProposalProps> = ({ event, onUpdate }) => {
  const [dates, setDates] = useState<Date[] | undefined>(undefined);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleAddDates = async () => {
    if (!dates || dates.length === 0) return;

    if (event.dateOptions.length + dates.length > 10) {
      toast({
        title: "Limit erreicht",
        description: `Maximal 10 Termine erlaubt. Du versuchst ${dates.length} hinzuzufügen, es ist nur noch Platz für ${Math.max(0, 10 - event.dateOptions.length)}.`,
        variant: "destructive",
      });
      return;
    }

    if (endTime && !startTime) {
      toast({
        title: "Ungültige Zeit",
        description: "Endzeit benötigt eine Startzeit.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Execute all adds in parallel
      const promises = dates.map(date => {
        const isoDate = format(date, "yyyy-MM-dd");
        return addDateOption(
          event.id,
          isoDate,
          startTime || undefined,
          endTime || undefined
        );
      });

      const results = await Promise.all(promises);

      // Check for errors
      const failures = results.filter(r => r.error);
      if (failures.length > 0) {
        throw new Error(`${failures.length} von ${dates.length} Terminen konnten nicht gespeichert werden.`);
      }

      // Use the data from the last successful request to update the event state
      const lastSuccess = results[results.length - 1];
      if (lastSuccess.data) {
        onUpdate(lastSuccess.data);
      }

      toast({
        title: "Termine hinzugefügt",
        description: `${dates.length} Termin(e) stehen nun zur Abstimmung bereit.`,
      });
      
      // Reset form
      setDates(undefined);
      setStartTime("");
      setEndTime("");
      setIsOpen(false);
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Konnte Termine nicht hinzufügen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal border-dashed border-2 hover:bg-accent/50",
            (!dates || dates.length === 0) && "text-muted-foreground"
          )}
        >
          <Plus className="mr-2 h-4 w-4" />
          {dates && dates.length > 0 ? (
            `${dates.length} Tag${dates.length > 1 ? "e" : ""} gewählt`
          ) : (
            "Termine vorschlagen"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Termine wählen</h4>
            <p className="text-sm text-muted-foreground">
              Wähle einen oder mehrere Tage zur Abstimmung.
            </p>
          </div>
          
          <Calendar
            mode="multiple"
            selected={dates}
            onSelect={setDates}
            initialFocus
            locale={de}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="start">Start (opt.)</Label>
              <Input
                id="start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end">Ende (opt.)</Label>
              <Input
                id="end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!startTime}
              />
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleAddDates} 
            disabled={!dates || dates.length === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Speichern...
              </>
            ) : (
              "Hinzufügen"
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};