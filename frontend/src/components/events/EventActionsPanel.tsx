import { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import { BellRing, Image as ImageIcon, Link2, MessageCircle, Send, Settings, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShareEventDialog } from "@/components/shared/ShareEventDialog";
import { PhaseComments } from "@/components/events/PhaseComments";
import { cn } from "@/lib/utils";
import {
  getEventComments,
  sendEventInvites,
  sendVotingReminder,
  uploadEventAvatar,
  updateEvent,
} from "@/services/apiClient";
import type { Event, EventPhase } from "@/types/domain";
import { toast } from "sonner";

interface EventActionsPanelProps {
  event: Event;
  isCreator: boolean;
  activePhase: EventPhase;
  onEventUpdated: (event: Event) => void;
}

interface ManageEventDialogProps {
  event: Event;
  isCreator: boolean;
  trigger: React.ReactNode;
  onEventUpdated: (event: Event) => void;
}

type ReminderLoadingState = string | "all" | null;

const phaseOrder: EventPhase[] = ["proposal", "voting", "scheduling", "info"];

interface ActionTileProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  description: string;
  accent: string;
  badge?: string | number;
}

const ActionTile = forwardRef<HTMLButtonElement, ActionTileProps>(
  ({ icon: Icon, label, description, accent, className, badge, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "group relative flex h-full w-full flex-col gap-1 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-muted/60 via-background to-background p-4 text-left transition-all",
          "hover:-translate-y-[1px] hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
          props.disabled && "opacity-60 cursor-not-allowed",
          className
        )}
        {...props}
      >
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="flex items-start justify-between gap-3">
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl text-primary shadow-sm shadow-primary/20 ring-1 ring-primary/20", accent)}>
            <Icon className="h-5 w-5" />
          </div>
          {badge ? (
            <Badge variant="destructive" className="rounded-full px-2 py-0 text-[11px] shadow-sm shadow-destructive/40">
              {badge}
            </Badge>
          ) : null}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold leading-tight">{label}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </button>
    );
  }
);
ActionTile.displayName = "ActionTile";

const ManageEventDialog = ({ event, isCreator, trigger, onEventUpdated }: ManageEventDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(event.name);
  const [description, setDescription] = useState(event.description || "");
  const [budgetType, setBudgetType] = useState(event.budgetType);
  const [budgetAmount, setBudgetAmount] = useState(event.budgetAmount.toString());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(event.name);
    setDescription(event.description || "");
    setBudgetType(event.budgetType);
    setBudgetAmount(event.budgetAmount.toString());
  }, [event]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCreator) {
      toast.error("Nur der Ersteller kann das Event bearbeiten");
      return;
    }
    if (!name.trim()) {
      toast.error("Bitte gib einen Namen ein");
      return;
    }
    setSaving(true);
    const result = await updateEvent(event.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      budgetType,
      budgetAmount: Number(budgetAmount) || 0,
    });
    setSaving(false);
    if (result.error || !result.data) {
      toast.error(result.error?.message || "Event konnte nicht aktualisiert werden");
      return;
    }
    onEventUpdated(result.data);
    toast.success("Event aktualisiert");
    setOpen(false);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!isCreator) {
      toast.error("Nur der Ersteller kann das Eventbild ändern");
      return;
    }
    setUploading(true);
    const result = await uploadEventAvatar(event.id, file);
    setUploading(false);
    if (result.error || !result.data) {
      toast.error(result.error?.message || "Upload fehlgeschlagen");
      return;
    }
    onEventUpdated(result.data);
    toast.success("Eventbild aktualisiert");
  };

  const handleAvatarRemove = async () => {
    if (!isCreator) {
      toast.error("Nur der Ersteller kann das Eventbild entfernen");
      return;
    }
    setUploading(true);
    const result = await updateEvent(event.id, { avatarUrl: "" });
    setUploading(false);
    if (result.error || !result.data) {
      toast.error(result.error?.message || "Bild konnte nicht entfernt werden");
      return;
    }
    onEventUpdated(result.data);
    toast.success("Eventbild entfernt");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Event verwalten</DialogTitle>
          <DialogDescription>Budget, Beschreibung und Eventbild anpassen.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-border/60 bg-secondary/40">
              {event.avatarUrl ? (
                <img src={event.avatarUrl} alt={event.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium">Event-Avatar</p>
              <p className="text-xs text-muted-foreground">Nur der Ersteller kann das Bild hochladen oder austauschen.</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-2 rounded-xl"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isCreator || uploading}
                >
                  <Sparkles className="h-4 w-4" />
                  {uploading ? "Lädt..." : "Bild hochladen"}
                </Button>
                {event.avatarUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => void handleAvatarRemove()}
                    disabled={!isCreator || uploading}
                  >
                    Entfernen
                  </Button>
                ) : null}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleAvatarUpload(file);
                    e.target.value = "";
                  }
                }}
              />
            </div>
          </div>

          <div className="grid gap-3">
            <Label className="text-sm">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Event-Name"
              className="rounded-xl"
              disabled={!isCreator}
            />
          </div>

          <div className="grid gap-3">
            <Label className="text-sm">Beschreibung</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Worum geht es?"
              rows={4}
              className="rounded-xl resize-none"
              disabled={!isCreator}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-sm">Budget-Typ</Label>
              <Select value={budgetType} onValueChange={(v: BudgetType) => setBudgetType(v)} disabled={!isCreator}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_person">pro Person</SelectItem>
                  <SelectItem value="total">Gesamtbudget</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-sm">Budget</Label>
              <Input
                type="number"
                min={0}
                step={5}
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                className="rounded-xl"
                disabled={!isCreator}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Abbrechen
            </Button>
            <Button type="submit" disabled={!isCreator || saving} className="rounded-xl">
              {saving ? "Speichere..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export function EventActionsPanel({ event, isCreator, activePhase, onEventUpdated }: EventActionsPanelProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [reminderLoading, setReminderLoading] = useState<ReminderLoadingState>(null);
  const [inviteSent, setInviteSent] = useState<boolean>(!!event.inviteSentAt);
  const [remindedUserIds, setRemindedUserIds] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(event.unreadMessageCount ?? 0);

  useEffect(() => {
    setInviteSent(!!event.inviteSentAt);
    setUnreadCount(event.unreadMessageCount ?? 0);
  }, [event.inviteSentAt, event.unreadMessageCount]);

  const outstandingVoters = useMemo(
    () => event.participants.filter((p) => !p.hasVoted),
    [event.participants]
  );
  const voters = useMemo(
    () => event.participants.filter((p) => p.hasVoted),
    [event.participants]
  );

  const reminderPhaseAllowed = event.phase === "voting" || event.phase === "scheduling";

  useEffect(() => {
    const refreshUnread = async () => {
      try {
        const lastSeenKey = `event:${event.id}:chat:last_seen`;
        const lastSeenValue = typeof window !== "undefined" ? window.localStorage.getItem(lastSeenKey) : null;
        const lastSeenDate = lastSeenValue ? new Date(lastSeenValue) : null;

        const results = await Promise.all(
          phaseOrder.map((phase) => getEventComments(event.id, phase, 0, 30))
        );
        const comments = results.flatMap((r) => r.data || []);
        const unread = lastSeenDate
          ? comments.filter((c) => new Date(c.createdAt) > lastSeenDate).length
          : comments.length;
        setUnreadCount(unread);
      } catch (error) {
        setUnreadCount(event.unreadMessageCount ?? 0);
      }
    };
    void refreshUnread();
  }, [event.id, event.unreadMessageCount]);

  const handleInviteSend = async () => {
    if (!isCreator) {
      toast.error("Nur der Ersteller kann Einladungen versenden");
      return;
    }
    setInviteLoading(true);
    const result = await sendEventInvites(event.id);
    setInviteLoading(false);
    if (result.error) {
      toast.error(result.error.message || "Einladungen konnten nicht gesendet werden");
      return;
    }
    if (isCreator) {
      const updated = await updateEvent(event.id, { inviteSentAt: new Date().toISOString() });
      if (updated.data) {
        onEventUpdated(updated.data);
      }
    }
    setInviteSent(true);
    toast.success(`${result.data?.sent ?? 0} Einladungen verschickt`);
    setInviteOpen(false);
  };

  const handleReminderSend = async (userId?: string) => {
    if (!reminderPhaseAllowed) {
      toast.error("Reminder nur in Voting oder Terminfindung möglich");
      return;
    }
    if (!isCreator) {
      toast.error("Nur der Ersteller kann Erinnerungen auslösen");
      return;
    }
    const key: ReminderLoadingState = userId ?? "all";
    setReminderLoading(key);
    const result = await sendVotingReminder(event.id, userId);
    setReminderLoading(null);
    if (result.error) {
      toast.error(result.error.message || "Erinnerung konnte nicht gesendet werden");
      return;
    }
    if (userId) {
      setRemindedUserIds((prev) => Array.from(new Set([...prev, userId])));
    } else {
      setRemindedUserIds(outstandingVoters.map((p) => p.userId));
    }
    toast.success(`${result.data?.sent ?? 0} Erinnerung(en) rausgeschickt`);
    if (isCreator) {
      const updated = await updateEvent(event.id, { lastReminderAt: new Date().toISOString() });
      if (updated.data) {
        onEventUpdated(updated.data);
      }
    }
  };

  const lastSeenKey = `event:${event.id}:chat:last_seen`;
  const handleChatOpenChange = (open: boolean) => {
    setChatOpen(open);
    if (open) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(lastSeenKey, new Date().toISOString());
      }
      setUnreadCount(0);
    } else {
      void refreshUnread();
    }
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ShareEventDialog
          event={event}
          trigger={
            <ActionTile
              icon={Link2}
              label="Event teilen"
              description="Link, Code oder QR senden."
              accent="bg-primary/10 text-primary"
            />
          }
        />

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <ActionTile
              icon={Send}
              label="Einladungen"
              description="An alle Raum-Mitglieder senden."
              accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200"
              disabled={!isCreator || inviteSent}
              badge={!isCreator ? "Nur Owner" : inviteSent ? "Gesendet" : undefined}
            />
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Einladungen senden</DialogTitle>
              <DialogDescription>
                Einladungen gehen einmalig an alle Mitglieder des Raums. Nach deiner Bestätigung werden E-Mails sofort verschickt.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Mitglieder im Raum</span>
                <span className="font-semibold">{event.participants.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Bereits abgestimmt</span>
                <span className="font-semibold">{voters.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Noch ausständig</span>
                <span className="font-semibold text-warning">{outstandingVoters.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Aktion ist nur einmalig möglich. Stelle sicher, dass alle Mitglieder bereit sind.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)} className="rounded-xl">
                Abbrechen
              </Button>
              <Button
                onClick={handleInviteSend}
                disabled={inviteSent || inviteLoading}
                className="rounded-xl gap-2"
              >
                {inviteLoading ? "Sende..." : "Einladungen verschicken"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Sheet open={chatOpen} onOpenChange={handleChatOpenChange}>
          <ActionTile
            icon={MessageCircle}
            label="Chat"
            description="Detailansicht öffnen."
            accent="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-100"
            onClick={() => setChatOpen(true)}
            badge={unreadCount > 0 ? unreadCount : undefined}
          />
          <SheetContent side="right" className="w-full sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Event-Chat</SheetTitle>
              <SheetDescription>
                Nachrichten pro Phase. Neue Beiträge siehst du hier sofort.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <PhaseComments eventId={event.id} phase={activePhase} />
            </div>
          </SheetContent>
        </Sheet>

        <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
          <DialogTrigger asChild>
            <ActionTile
              icon={BellRing}
              label="Voting-Reminder"
              description="Erinnere Mitglieder ohne Stimme."
              accent="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-100"
              disabled={!isCreator || outstandingVoters.length === 0 || !reminderPhaseAllowed}
              badge={
                !isCreator
                  ? "Nur Owner"
                  : !reminderPhaseAllowed
                  ? "Nur Voting/Termin"
                  : outstandingVoters.length > 0
                  ? outstandingVoters.length
                  : undefined
              }
            />
          </DialogTrigger>
          <DialogContent className="sm:max-w-[620px]">
            <DialogHeader>
              <DialogTitle>Voting-Reminder senden</DialogTitle>
              <DialogDescription>Alle sehen den aktuellen Status. Einzelne oder alle erinnern.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {event.participants.map((p) => {
                const pending = !p.hasVoted;
                const reminded = remindedUserIds.includes(p.userId);
                return (
                  <div
                    key={p.userId}
                    className={cn(
                      "flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3",
                      pending ? "ring-1 ring-warning/30" : "opacity-80"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                        {p.userName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{p.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {pending ? "Noch keine Stimme" : "Hat bereits abgestimmt"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={pending ? "destructive" : "secondary"} className="rounded-full">
                        {pending ? "Offen" : "Abgestimmt"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => void handleReminderSend(p.userId)}
                        disabled={!pending || reminderLoading !== null}
                      >
                        {reminderLoading === p.userId ? "Sendet..." : reminded ? "Erinnert" : "Per Mail erinnern"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter className="flex-col gap-3 sm:flex-row sm:justify-between">
              <div className="text-xs text-muted-foreground">
                Mitglieder ohne Stimme bekommen eine kurze, freundliche Erinnerung.
              </div>
              <Button
                onClick={() => void handleReminderSend()}
                disabled={outstandingVoters.length === 0 || reminderLoading !== null}
                className="rounded-xl gap-2"
              >
                {reminderLoading === "all" ? "Sende..." : "Alle offenen erinnern"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ManageEventDialog
          event={event}
          isCreator={isCreator}
          onEventUpdated={onEventUpdated}
          trigger={
            <ActionTile
              icon={Settings}
              label="Event verwalten"
              description="Budget, Beschreibung, Bild."
              accent="bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
              disabled={!isCreator}
              badge={isCreator ? undefined : "Nur Owner"}
            />
          }
        />
      </div>
    </>
  );
}
