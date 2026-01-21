import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Compass,
  Heart,
  LogIn,
  Plus,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
import { CreateRoomDialog } from "@/components/shared/CreateRoomDialog";
import { JoinRoomDialog } from "@/components/shared/JoinRoomDialog";
import { RoomCard, RoomCardSkeleton } from "@/components/shared/RoomCard";
import { CompanyAutocomplete } from "@/components/shared/CompanyAutocomplete";
import { toast } from "@/hooks/use-toast";
import { getRooms, updateUser } from "@/services/apiClient";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { cn } from "@/lib/utils";
import { getPendingInviteCode, PENDING_INVITE_EVENT } from "@/lib/pendingRoomInvite";
import type { Room } from "@/types/domain";

type PreferenceSet = {
  physical?: number;
  mental?: number;
  social?: number;
  competition?: number;
};

const steps = [
  {
    title: "Präferenzen",
    description: "Sag uns, was dir und deinem Team wichtig ist.",
  },
  {
    title: "Aktivitäten",
    description: "Favorisiere spannende Ideen mit dem Herz-Symbol.",
  },
  {
    title: "Räume",
    description: "Tritt einem Raum bei oder erstelle einen neuen.",
  },
];

const sortRoomsByMembers = (input: Room[]) =>
  [...input].sort((a, b) => {
    const diff = (b.memberCount ?? 0) - (a.memberCount ?? 0);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, "de");
  });

export default function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const completedByUserId = useOnboardingStore((state) => state.completedByUserId);
  const markComplete = useOnboardingStore((state) => state.markComplete);

  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const [physical, setPhysical] = useState([3]);
  const [mental, setMental] = useState([3]);
  const [social, setSocial] = useState([3]);
  const [competition, setCompetition] = useState([3]);

  const [hobbies, setHobbies] = useState<string[]>([]);
  const [newHobby, setNewHobby] = useState("");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(() => getPendingInviteCode());
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

  const isCompleted = user ? !!completedByUserId[user.id] : false;
  const progressValue = useMemo(() => ((step + 1) / steps.length) * 100, [step]);
  const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname;

  useEffect(() => {
    // Scroll to top when step changes (important for mobile)
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
  }, []);

  useEffect(() => {
    if (!user || isInitialized) {
      return;
    }

    const preferences = (user.activityPreferences || {}) as PreferenceSet;
    setPhysical([preferences.physical ?? 3]);
    setMental([preferences.mental ?? 3]);
    setSocial([preferences.social ?? 3]);
    setCompetition([preferences.competition ?? 3]);
    setHobbies(user.hobbies ?? []);
    setCompanyId(user.companyId ?? null);
    setIsInitialized(true);
  }, [user, isInitialized]);

  const fetchRooms = useCallback(
    async (showLoading = true) => {
      if (!user) {
        return;
      }
      if (showLoading) {
        setRoomsLoading(true);
      }
      const result = await getRooms();
      const roomsData = result.data || [];
      setRooms(sortRoomsByMembers(roomsData));
      setRoomsLoading(false);
    },
    [user]
  );

  useEffect(() => {
    if (!user) {
      return;
    }
    void fetchRooms();
  }, [user, fetchRooms]);

  useEffect(() => {
    if (!user) {
      return;
    }
    const handlePendingInviteChange = () => {
      setPendingInviteCode(getPendingInviteCode());
      void fetchRooms(false);
    };
    window.addEventListener(PENDING_INVITE_EVENT, handlePendingInviteChange);
    return () => {
      window.removeEventListener(PENDING_INVITE_EVENT, handlePendingInviteChange);
    };
  }, [user, fetchRooms]);

  const addHobby = () => {
    const trimmed = newHobby.trim();
    if (!trimmed) {
      return;
    }
    if (hobbies.includes(trimmed)) {
      setNewHobby("");
      return;
    }
    setHobbies((prev) => [...prev, trimmed]);
    setNewHobby("");
  };

  const removeHobby = (hobbyToRemove: string) => {
    setHobbies((prev) => prev.filter((hobby) => hobby !== hobbyToRemove));
  };

  const handleHobbyKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addHobby();
    }
  };

  const handleLightModeToggle = useCallback((checked: boolean) => {
    const nextIsDark = !checked;
    setIsDarkMode(nextIsDark);
    if (nextIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      return;
    }
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }, []);

  const handleRoomCreated = (newRoom?: Room | null) => {
    if (!newRoom) {
      return;
    }
    setRooms((prev) => sortRoomsByMembers([...prev, newRoom]));
  };

  const savePreferences = async () => {
    if (!user) {
      return false;
    }

    setIsSaving(true);
    const result = await updateUser({
      hobbies,
      companyId,
      activityPreferences: {
        physical: physical[0],
        mental: mental[0],
        social: social[0],
        competition: competition[0],
      },
    });
    setIsSaving(false);

    if (result.error) {
      toast({
        title: "Speichern fehlgeschlagen",
        description: "Du kannst die Präferenzen später im Profil anpassen.",
        variant: "destructive",
      });
      return false;
    }

    const isMobile = typeof window !== "undefined"
      && window.matchMedia("(max-width: 639px)").matches;

    if (!isMobile) {
      toast({
        title: "Präferenzen gespeichert",
        description: "Du kannst alles später im Profil anpassen.",
      });
    }

    return true;
  };

  const handleNext = async () => {
    if (step === 0) {
      await savePreferences();
      setStep(1);
      return;
    }
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleFinish = () => {
    if (user) {
      markComplete(user.id);
    }
    navigate("/activities", { replace: true });
  };

  const handleSkipOnboarding = useCallback((targetPath?: string) => {
    if (!user) {
      return;
    }
    markComplete(user.id);
    setIsExitDialogOpen(false);
    const nextPath = targetPath && targetPath !== "/onboarding" ? targetPath : "/activities";
    navigate(nextPath, { replace: true });
  }, [user, markComplete, navigate, setIsExitDialogOpen]);

  const handleAttemptExit = useCallback(() => {
    setIsExitDialogOpen(true);
  }, [setIsExitDialogOpen]);

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/20 animate-pulse" />
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

    return (
      <div className="mx-auto w-full max-w-5xl pb-24 sm:pb-8">
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-3xl shadow-2xl">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Willkommen, {user.firstName}!</CardTitle>
                <CardDescription>Deine kurze Einleitung zu EventHorizon.</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              className="rounded-xl"
              onClick={isCompleted ? handleFinish : handleAttemptExit}
            >
              Schließen
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {steps.map((stepItem, index) => (
                <div key={stepItem.title} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-6 rounded-full",
                      index <= step ? "bg-primary" : "bg-muted"
                    )}
                  />
                  <span className={cn(index === step && "text-foreground")}>{stepItem.title}</span>
                </div>
              ))}
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step-preferences"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]"
              >
                <div className="rounded-2xl border border-border/60 bg-card/60 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Deine Aktivitäts-Präferenzen</h3>
                      <p className="text-sm text-muted-foreground">
                        Diese Werte sind essenziell um passende Vorschläge für dein Team zu finden. Wähle sorgfältig aus!
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <Label>Körperliche Aktivität</Label>
                        <span className="text-muted-foreground">{physical[0]}/5</span>
                      </div>
                      <Slider value={physical} onValueChange={setPhysical} min={0} max={5} step={1} />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <Label>Mentale Herausforderung</Label>
                        <span className="text-muted-foreground">{mental[0]}/5</span>
                      </div>
                      <Slider value={mental} onValueChange={setMental} min={0} max={5} step={1} />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <Label>Soziale Interaktion</Label>
                        <span className="text-muted-foreground">{social[0]}/5</span>
                      </div>
                      <Slider value={social} onValueChange={setSocial} min={0} max={5} step={1} />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <Label>Wettbewerb</Label>
                        <span className="text-muted-foreground">{competition[0]}/5</span>
                      </div>
                      <Slider value={competition} onValueChange={setCompetition} min={0} max={5} step={1} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                    <CompanyAutocomplete
                      id="onboarding-company"
                      label="Firma"
                      value={companyId}
                      onChange={setCompanyId}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                    <Label htmlFor="onboarding-light-mode" className="text-sm font-medium">
                      Hellmodus
                    </Label>
                    <Switch
                      id="onboarding-light-mode"
                      checked={!isDarkMode}
                      onCheckedChange={handleLightModeToggle}
                    />
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                    Deine Präferenzen kannst du jederzeit im Profil bearbeiten.
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/60 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-secondary/70 flex items-center justify-center">
                      <Heart className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Hobbys (optional)</h3>
                      <p className="text-sm text-muted-foreground">
                        Nenne ein paar Interessen, damit wir dich noch besser verstehen.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="onboarding-hobby">Hobby hinzufügen</Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="onboarding-hobby"
                        placeholder="z.B. Wandern"
                        value={newHobby}
                        onChange={(event) => setNewHobby(event.target.value)}
                        onKeyDown={handleHobbyKeyDown}
                        className="rounded-xl"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addHobby}
                        className="rounded-xl"
                      >
                        Hinzufügen
                      </Button>
                    </div>
                  </div>

                  {hobbies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {hobbies.map((hobby) => (
                        <Badge key={hobby} variant="secondary" className="rounded-lg px-3 py-1">
                          <span className="flex items-center gap-2">
                            {hobby}
                            <button
                              type="button"
                              onClick={() => removeHobby(hobby)}
                              className="rounded-full p-0.5 hover:bg-destructive/20"
                              aria-label={`Hobby ${hobby} entfernen`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Noch keine Hobbys hinzugefügt. Hobbys sind optional.
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-activities"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                        <Heart className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Favoriten setzen</h3>
                        <p className="text-sm text-muted-foreground">
                          Tippe auf das Herz-Symbol, um Aktivitäten zu speichern, die deinem Team gefallen.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Compass className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Aktivitäten entdecken</h3>
                        <p className="text-sm text-muted-foreground">
                          Nutze Filter und Suche, um schnell die besten Vorschläge für euer Team zu finden.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-muted/40 p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-secondary/70 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Tipp</h3>
                      <p className="text-sm text-muted-foreground">
                        Je mehr Favoriten ihr sammelt, desto besser werden spätere Vorschläge und Abstimmungen.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-rooms"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-card/60 p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <LogIn className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Einem Raum beitreten</h3>
                        <p className="text-sm text-muted-foreground">
                          Nutze den Zugangscode deines Teams, um direkt mitzuwirken.
                        </p>
                      </div>
                    </div>
                    <JoinRoomDialog
                      trigger={
                        <Button variant="outline" className="w-full rounded-xl gap-2">
                          <LogIn className="h-4 w-4" />
                          Raum beitreten
                        </Button>
                      }
                    />
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-card/60 p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-secondary/70 flex items-center justify-center">
                        <Plus className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Neuen Raum erstellen</h3>
                        <p className="text-sm text-muted-foreground">
                          Erstelle einen Raum für dein Team und lade Mitglieder ein.
                        </p>
                      </div>
                    </div>
                    <CreateRoomDialog
                      onRoomCreated={handleRoomCreated}
                      trigger={
                        <Button className="w-full rounded-xl gap-2">
                          <Plus className="h-4 w-4" />
                          Raum erstellen
                        </Button>
                      }
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/60 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-secondary/70 flex items-center justify-center">
                      <Users className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Deine Räume</h3>
                      <p className="text-sm text-muted-foreground">
                        Du bist bereits Mitglied in diesen Räumen.
                      </p>
                    </div>
                  </div>

                  {roomsLoading ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {[1, 2].map((index) => (
                        <RoomCardSkeleton key={`onboarding-room-skeleton-${index}`} />
                      ))}
                    </div>
                  ) : rooms.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {rooms.map((room) => (
                        <RoomCard key={room.id} room={room} interactive={false} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                      {pendingInviteCode
                        ? "Falls du über einen Einladungslink gekommen bist, wird der Raum automatisch hinzugefügt."
                        : "Noch keinem Raum beigetreten. Nutze oben einen Zugangscode oder erstelle einen neuen Raum."}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Aktivitäten favorisieren</h3>
                      <p className="text-sm text-muted-foreground">
                        Schau dir jetzt die Aktivitäten an und markiere Favoriten mit dem Herz-Symbol. Das hilft der KI-Analyse und macht die Eventplanung für dein Team noch besser.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Separator />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="rounded-full">
                Schritt {step + 1} von {steps.length}
              </Badge>
              <span>{steps[step].description}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={step === 0}
                className="rounded-xl"
              >
                Zurück
              </Button>
              {step < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSaving}
                  className="rounded-xl"
                >
                  {isSaving ? "Speichern..." : "Weiter"}
                </Button>
              ) : (
                <Button type="button" onClick={handleFinish} className="rounded-xl">
                  Aktivitäten entdecken
                </Button>
              )}
            </div>
          </div>
        </CardContent>
        </Card>
        <AlertDialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader className="text-left">
              <AlertDialogTitle>Onboarding zuerst abschließen</AlertDialogTitle>
              <AlertDialogDescription>
                Bitte beende das Onboarding. Du kannst es auch überspringen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-end">
              <AlertDialogCancel className="rounded-xl">Weiter im Onboarding</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl"
                onClick={() => handleSkipOnboarding(fromPath)}
              >
                Onboarding überspringen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }
