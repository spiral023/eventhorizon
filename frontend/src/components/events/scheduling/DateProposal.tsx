import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { addDateOption } from "@/services/apiClient";
import type { Event } from "@/types/domain";

interface DateProposalProps {
  event: Event;
  onUpdate: (updatedEvent: Event) => void;
}

export const DateProposal: React.FC<DateProposalProps> = ({ event, onUpdate }) => {
  const [dates, setDates] = useState<Date[] | undefined>(undefined);
  const [step, setStep] = useState<"select" | "times">("select");
  const [dateTimes, setDateTimes] = useState<Record<string, { start?: string; end?: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const eventCode = event.shortCode || event.id;
  const maxDates = 5;
  const remainingSlots = Math.max(0, maxDates - event.dateOptions.length);
  const selectedDates = useMemo(
    () => (dates ? [...dates].sort((a, b) => a.getTime() - b.getTime()) : []),
    [dates],
  );
  const tooManyDates = selectedDates.length > remainingSlots;
  const stepLabel = step === "select" ? "Schritt 1 von 2" : "Schritt 2 von 2";

  useEffect(() => {
    if (!dates || dates.length === 0) {
      setDateTimes({});
      if (step === "times") setStep("select");
      return;
    }

    setDateTimes((prev) => {
      const next: Record<string, { start?: string; end?: string }> = {};
      dates.forEach((date) => {
        const key = format(date, "yyyy-MM-dd");
        const existing = prev[key] ?? {};
        next[key] = { start: existing.start ?? "", end: existing.end ?? "" };
      });
      return next;
    });
  }, [dates, step]);

  const handleAddDates = async () => {
    if (!dates || dates.length === 0) return;

    if (event.dateOptions.length + dates.length > maxDates) {
      toast.error("Limit erreicht", {
        description: `Maximal ${maxDates} Termine erlaubt. Du versuchst ${dates.length} hinzuzufügen, es ist nur noch Platz für ${Math.max(0, maxDates - event.dateOptions.length)}.`,
      });
      return;
    }

    setIsLoading(true);
    try {
      let latestEvent: Event | null = event;

      // Füge Termine nacheinander hinzu, damit jede Antwort den aktuellen Stand enthält
      for (const date of dates) {
        const isoDate = format(date, "yyyy-MM-dd");
        const timeConfig = dateTimes[isoDate] ?? {};
        const start = (timeConfig.start ?? "").trim();
        const end = (timeConfig.end ?? "").trim();

        if (end && !start) {
          toast.error("Ungültige Zeit", {
            description: `Für ${format(date, "EEE, dd.MM", { locale: de })} fehlt die Startzeit.`,
          });
          setIsLoading(false);
          return;
        }

        const res = await addDateOption(
          eventCode,
          isoDate,
          start || undefined,
          end || undefined,
        );

        if (res.error || !res.data) {
          throw new Error("Termin konnte nicht gespeichert werden.");
        }

        latestEvent = res.data;
        onUpdate(res.data);
      }

      if (latestEvent) {
        onUpdate(latestEvent);
      }

      toast.success("Termine hinzugefügt", {
        description: `${dates.length} Termin(e) stehen nun zur Abstimmung bereit.`,
      });

      // Reset form
      setDates(undefined);
      setDateTimes({});
      setStep("select");
      setIsOpen(false);
    } catch (err) {
      toast.error("Fehler", {
        description: err instanceof Error ? err.message : "Konnte Termine nicht hinzufügen",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeChange = (key: string, field: "start" | "end", value: string) => {
    setDateTimes((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setStep("select");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal border-dashed border-2 hover:bg-accent/50",
            (!dates || dates.length === 0) && "text-muted-foreground",
          )}
        >
          <Plus className="mr-2 h-4 w-4" />
          {dates && dates.length > 0 ? (
            `${dates.length} Tag${dates.length > 1 ? "e" : ""} gewählt`
          ) : (
            "Termine vorschlagen"
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[96vw] max-w-[900px] max-h-[90vh] sm:max-h-[85vh] rounded-2xl sm:rounded-3xl flex flex-col p-0 gap-0 border-none bg-background overflow-hidden shadow-2xl">
        <DialogHeader className="p-4 sm:p-6 bg-primary/5 border-b border-border/50">
          <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Termine vorschlagen
          </DialogTitle>
          <DialogDescription>
            Wähle die Termine für die Abstimmung.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {stepLabel}
              </span>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                {tooManyDates && (
                  <span className="text-destructive">
                    Zu viele Termine ausgewählt.
                  </span>
                )}
              </div>
            </div>

            {step === "select" ? (
              <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-border/50 bg-card/40">
                  <Calendar
                    mode="multiple"
                    selected={dates}
                    onSelect={setDates}
                    initialFocus
                    locale={de}
                    numberOfMonths={isMobile ? 1 : 2}
                    className="p-2 sm:p-3"
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-border/50 bg-card/40 p-3 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">Auswahl</h3>
                        <Badge variant="secondary">{selectedDates.length}</Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 sm:h-9 sm:px-3"
                        onClick={() => setDates(undefined)}
                        disabled={selectedDates.length === 0}
                      >
                        Auswahl zurücksetzen
                      </Button>
                    </div>

                    {selectedDates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Keine Termine ausgewählt.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedDates.map((date) => (
                          <span
                            key={format(date, "yyyy-MM-dd")}
                            className="inline-flex items-center rounded-full border border-border/50 bg-background px-2.5 py-1 text-xs font-medium"
                          >
                            {format(date, "EEE, dd.MM", { locale: de })}
                          </span>
                        ))}
                      </div>
                    )}

                  </div>

                </div>
              </div>
            ) : (
              <div className="space-y-5 sm:space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">Uhrzeiten pro Termin</h3>
                    <Badge variant="secondary">{selectedDates.length}</Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 sm:h-9 sm:px-3"
                    onClick={() => setStep("select")}
                  >
                    Zurück zur Auswahl
                  </Button>
                </div>

                <div className="rounded-2xl border border-border/50 bg-card/40 p-3 sm:p-4 space-y-4">
                  {selectedDates.map((date) => {
                    const key = format(date, "yyyy-MM-dd");
                    const timeConfig = dateTimes[key] ?? {};
                    return (
                      <div key={key} className="grid gap-3 sm:grid-cols-[1fr_260px] items-start">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">
                            {format(date, "EEEE", { locale: de })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(date, "dd.MM.yyyy")}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor={`start-${key}`}>Start</Label>
                            <Input
                              id={`start-${key}`}
                              type="time"
                              value={timeConfig.start ?? ""}
                              onChange={(e) => handleTimeChange(key, "start", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`end-${key}`}>Ende</Label>
                            <Input
                              id={`end-${key}`}
                              type="time"
                              value={timeConfig.end ?? ""}
                              onChange={(e) => handleTimeChange(key, "end", e.target.value)}
                              disabled={!timeConfig.start}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground">
                  Uhrzeiten sind optional. Leere Felder werden ohne Zeitangabe gespeichert.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 pt-0 sm:p-6 sm:pt-0 gap-2">
          {step === "select" ? (
            <>
              <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => setIsOpen(false)}>
                Abbrechen
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setStep("times")}
                disabled={selectedDates.length === 0}
              >
                Uhrzeiten pro Termin
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={handleAddDates}
                disabled={selectedDates.length === 0 || isLoading || tooManyDates}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  "Termine speichern"
                )}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => setStep("select")}>
                Zurück zur Auswahl
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={handleAddDates}
                disabled={selectedDates.length === 0 || isLoading || tooManyDates}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  "Termine speichern"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
