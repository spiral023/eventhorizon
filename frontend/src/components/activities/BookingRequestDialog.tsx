import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar as CalendarIcon, Users, Clock, Mail, Phone, User, CheckCircle2, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { sendBookingRequest } from "@/services/apiClient";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { Activity } from "@/types/domain";

interface BookingRequestDialogProps {
  activity: Activity;
  children: React.ReactNode;
  defaultDate?: string | Date;
  defaultStartTime?: string;
  defaultEndTime?: string;
  defaultParticipants?: number;
}

export function BookingRequestDialog({
  activity,
  children,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  defaultParticipants,
}: BookingRequestDialogProps) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [participants, setParticipants] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [contactName, setContactName] = useState(user?.name || "");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [contactPhone, setContactPhone] = useState(user?.phone || "");

  const parseDefaultDate = (value?: string | Date) => {
    if (!value) return undefined;
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const applyDefaults = useCallback(() => {
    setStep(1);
    setDate(parseDefaultDate(defaultDate));
    setStartTime(defaultStartTime ?? "");
    setEndTime(defaultEndTime ?? "");
    setParticipants(defaultParticipants && defaultParticipants > 0 ? String(defaultParticipants) : "");
    setNotes("");
    setContactName(user?.name || "");
    setContactEmail(user?.email || "");
    setContactPhone(user?.phone || "");
  }, [
    defaultDate,
    defaultStartTime,
    defaultEndTime,
    defaultParticipants,
    user?.name,
    user?.email,
    user?.phone,
  ]);

  useEffect(() => {
    if (open) {
      applyDefaults();
    }
  }, [open, applyDefaults]);

  const handleNext = () => {
    if (step === 1) {
      if (!date || !participants || !startTime) {
        toast.error("Bitte fülle alle Pflichtfelder aus.");
        return;
      }
    }
    if (step === 2) {
      if (!contactName || !contactEmail) {
        toast.error("Bitte Name und E-Mail angeben.");
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!date) return;
    
    setLoading(true);
    const result = await sendBookingRequest(activity.id, {
      participantCount: parseInt(participants),
      requestedDate: date.toISOString(),
      startTime,
      endTime,
      notes,
      contactName,
      contactEmail,
      contactPhone,
    });

    setLoading(false);

    if (result.error) {
      toast.error(result.error.message || "Anfrage konnte nicht gesendet werden.");
    } else {
      toast.success("Buchungsanfrage erfolgreich gesendet!");
      setStep(4); // Success step
    }
  };

  const resetForm = () => {
    applyDefaults();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {step < 4 && (
          <DialogHeader>
            <DialogTitle>Buchungsanfrage senden</DialogTitle>
            <DialogDescription>
              Frage unverbindlich bei {activity.provider || "dem Anbieter"} an.
            </DialogDescription>
          </DialogHeader>
        )}

        {/* Steps Indicator */}
        {step < 4 && (
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-2 flex-1 rounded-full transition-colors",
                  step >= i ? "bg-primary" : "bg-secondary"
                )}
              />
            ))}
          </div>
        )}

        <div className="py-4">
          {/* Step 1: Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Wunschtermin *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP", { locale: de }) : "Datum wählen"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Uhrzeit von *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      className="pl-9"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>bis (optional)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      className="pl-9"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Anzahl Personen *</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="1"
                    placeholder="z.B. 10"
                    className="pl-9"
                    value={participants}
                    onChange={(e) => setParticipants(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notizen / Wünsche</Label>
                <Textarea
                  placeholder="Besondere Anforderungen, Allergien, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 2: Contact */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Dein Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>E-Mail Adresse *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    className="pl-9"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Telefonnummer</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    className="pl-9"
                    placeholder="+43 ..."
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Summary */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <h4 className="font-semibold text-sm text-foreground">Zusammenfassung</h4>
                <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground">Aktivität:</span>
                  <span>{activity.title}</span>
                  
                  <span className="text-muted-foreground">Datum:</span>
                  <span>{date ? format(date, "PPP", { locale: de }) : "-"}</span>
                  
                  <span className="text-muted-foreground">Zeit:</span>
                  <span>{startTime} {endTime ? `- ${endTime}` : ""} Uhr</span>
                  
                  <span className="text-muted-foreground">Personen:</span>
                  <span>{participants}</span>
                  
                  <span className="text-muted-foreground">Kontakt:</span>
                  <span>{contactName} ({contactEmail})</span>
                </div>
                {notes && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground block mb-1">Notizen:</span>
                    <p className="text-sm italic">"{notes}"</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Durch Klick auf "Anfrage senden" wird eine E-Mail an den Anbieter generiert.
              </p>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center text-center py-6 space-y-4">
              <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold">Anfrage versendet!</h3>
              <p className="text-muted-foreground">
                Wir haben deine Buchungsanfrage an {activity.provider || "den Anbieter"} weitergeleitet.
                Du erhältst eine Bestätigung per E-Mail.
              </p>
              <Button onClick={resetForm} className="mt-4">
                Schließen
              </Button>
            </div>
          )}
        </div>

        {step < 4 && (
          <DialogFooter className="flex sm:justify-between gap-2">
            {step > 1 ? (
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
              </Button>
            ) : (
              <div /> // Spacer
            )}
            
            {step < 3 ? (
              <Button onClick={handleNext}>
                Weiter <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Anfrage senden
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
