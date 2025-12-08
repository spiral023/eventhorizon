import { Mail, Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { sendEventInvites, sendVotingReminder } from "@/services/apiClient";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface EmailActionsProps {
  eventId: string;
  className?: string;
}

export function EmailActions({ eventId, className }: EmailActionsProps) {
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);

  const handleSendInvites = async () => {
    setInviteLoading(true);
    try {
      const result = await sendEventInvites(eventId);
      setInviteSent(true);
      toast({
        title: "Einladungen versendet!",
        description: `${result.data.sent} E-Mails wurden erfolgreich versendet.`,
      });
      setTimeout(() => setInviteSent(false), 3000);
    } catch {
      toast({
        title: "Fehler",
        description: "E-Mails konnten nicht versendet werden.",
        variant: "destructive",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleSendReminder = async () => {
    setReminderLoading(true);
    try {
      const result = await sendVotingReminder(eventId);
      setReminderSent(true);
      toast({
        title: "Erinnerungen versendet!",
        description: `${result.data.sent} Teilnehmer wurden erinnert.`,
      });
      setTimeout(() => setReminderSent(false), 3000);
    } catch {
      toast({
        title: "Fehler",
        description: "Erinnerungen konnten nicht versendet werden.",
        variant: "destructive",
      });
    } finally {
      setReminderLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button
        variant="secondary"
        size="sm"
        className="gap-2 rounded-xl"
        onClick={handleSendInvites}
        disabled={inviteLoading}
      >
        {inviteLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : inviteSent ? (
          <Check className="h-4 w-4 text-success" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        Einladungen senden
      </Button>
      <Button
        variant="secondary"
        size="sm"
        className="gap-2 rounded-xl"
        onClick={handleSendReminder}
        disabled={reminderLoading}
      >
        {reminderLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : reminderSent ? (
          <Check className="h-4 w-4 text-success" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        Voting-Erinnerung
      </Button>
    </div>
  );
}
