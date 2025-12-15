import { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import { BellRing, Image as ImageIcon, Link2, MessageCircle, Send, Settings, Sparkles, MoreVertical } from "lucide-react";
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { Event, EventPhase, BudgetType } from "@/types/domain";
import { toast } from "sonner";

interface EventActionsPanelProps {
  event: Event;
  isCreator: boolean;
  activePhase: EventPhase;
  onEventUpdated: (event: Event) => void;
  className?: string;
}

interface ManageEventDialogProps {
  event: Event;
  isCreator: boolean;
  trigger: React.ReactNode;
  onEventUpdated: (event: Event) => void;
}

type ReminderLoadingState = string | "all" | null;

const phaseOrder: EventPhase[] = ["proposal", "voting", "scheduling", "info"];

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

export function EventActionsPanel({ event, isCreator, activePhase, onEventUpdated, className }: EventActionsPanelProps) {
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

  interface ActionButtonProps extends React.ComponentPropsWithoutRef<typeof Button> {
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    badge?: number;
  }

  const ActionButton = ({ icon: Icon, label, onClick, disabled, badge, ...props }: ActionButtonProps) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative h-9 w-9 rounded-full hover:bg-muted", disabled && "opacity-50")}
          onClick={onClick}
          disabled={disabled}
          {...props}
        >
          <Icon className="h-5 w-5 text-muted-foreground" />
          {badge && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground ring-2 ring-background">
              {badge}
            </span>
          )}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("flex items-center gap-1", className)}>
        {/* Share */}
        <ShareEventDialog
          event={event}
          trigger={
            <div className="inline-flex">
              <ActionButton icon={Link2} label="Event teilen" />
            </div>
          }
        />

        {/* Invite */}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <div className="inline-flex">
               <ActionButton 
                 icon={Send} 
                 label="Einladungen senden" 
                 disabled={!isCreator || inviteSent}
                 badge={inviteSent ? undefined : undefined} // Maybe add dot if not sent?
               />
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Einladungen senden</DialogTitle>
              <DialogDescription>
                Einladungen gehen einmalig an alle Mitglieder des Raums.
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

        {/* Chat */}
        <Sheet open={chatOpen} onOpenChange={handleChatOpenChange}>
          <SheetTrigger asChild>
            <div className="inline-flex">
              <ActionButton 
                icon={MessageCircle} 
                label="Chat öffnen" 
                badge={unreadCount > 0 ? unreadCount : undefined}
              />
            </div>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Event-Chat</SheetTitle>
              <SheetDescription>
                Diskutiere mit den anderen Teilnehmern.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <PhaseComments eventId={event.id} phase={activePhase} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Reminder */}
        {isCreator && reminderPhaseAllowed && (
          <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
            <DialogTrigger asChild>
              <div className="inline-flex">
                <ActionButton 
                  icon={BellRing} 
                  label="Reminder senden"
                  disabled={outstandingVoters.length === 0}
                  badge={outstandingVoters.length > 0 ? outstandingVoters.length : undefined}
                />
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[620px]">
              <DialogHeader>
                <DialogTitle>Voting-Reminder senden</DialogTitle>
                <DialogDescription>Erinnere Mitglieder, die noch nicht abgestimmt haben.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
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
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                          {p.userName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-tight">{p.userName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         {pending ? (
                            <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-lg text-xs"
                            onClick={() => void handleReminderSend(p.userId)}
                            disabled={reminderLoading !== null}
                          >
                            {reminderLoading === p.userId ? "..." : reminded ? "Erinnert" : "Erinnern"}
                          </Button>
                         ) : (
                           <Badge variant="secondary" className="rounded-full text-[10px]">Abgestimmt</Badge>
                         )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  onClick={() => void handleReminderSend()}
                  disabled={outstandingVoters.length === 0 || reminderLoading !== null}
                  className="rounded-xl w-full sm:w-auto"
                >
                  {reminderLoading === "all" ? "Sende..." : "Alle offenen erinnern"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Settings */}
        {isCreator && (
           <ManageEventDialog
            event={event}
            isCreator={isCreator}
            onEventUpdated={onEventUpdated}
            trigger={
              <div className="inline-flex">
                 <ActionButton icon={Settings} label="Einstellungen" />
              </div>
            }
          />
        )}
      </div>
    </TooltipProvider>
  );
}
