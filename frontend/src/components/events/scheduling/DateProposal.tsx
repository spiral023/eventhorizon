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
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleAddDate = async () => {
    if (!date) return;

    if (event.dateOptions.length >= 10) {
      toast({
        title: "Limit erreicht",
        description: "Maximal 10 Termine erlaubt.",
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
      // Format date as ISO string (YYYY-MM-DD)
      const isoDate = format(date, "yyyy-MM-dd");
      const { data, error } = await addDateOption(
        event.id,
        isoDate,
        startTime || undefined,
        endTime || undefined
      );

      if (error || !data) {
        throw new Error(error?.message || "Fehler beim Hinzufügen");
      }

      onUpdate(data);
      toast({
        title: "Termin hinzugefügt",
        description: "Der Termin steht nun zur Abstimmung bereit.",
      });
      
      // Reset form
      setDate(undefined);
      setStartTime("");
      setEndTime("");
      setIsOpen(false);
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Konnte Termin nicht hinzufügen",
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
            !date && "text-muted-foreground"
          )}
        >
          <Plus className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP", { locale: de }) : "Neuen Termin vorschlagen"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Termin wählen</h4>
            <p className="text-sm text-muted-foreground">
              Füge einen Tag zur Abstimmung hinzu.
            </p>
          </div>
          
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
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
            onClick={handleAddDate} 
            disabled={!date || isLoading}
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
