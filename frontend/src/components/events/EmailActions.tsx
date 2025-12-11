import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Bell, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { sendEventInvites, sendVotingReminder } from "@/services/apiClient";

interface EmailActionsProps {
  eventId: string;
  className?: string;
  children?: React.ReactNode;
}

export function EmailActions({ eventId, className, children }: EmailActionsProps) {
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);

  const handleSendInvites = async () => {
    setInvitesLoading(true);
    try {
      const result = await sendEventInvites(eventId);
      if (result.error) throw new Error(result.error.message);
      
      toast({
        title: "Einladungen versendet",
        description: `${result.data.sent} Einladungen wurden erfolgreich verschickt.`,
      });
    } catch (e) {
      toast({
        title: "Fehler",
        description: "Einladungen konnten nicht gesendet werden.",
        variant: "destructive",
      });
    } finally {
      setInvitesLoading(false);
    }
  };

  const handleSendReminder = async () => {
    setReminderLoading(true);
    try {
      const result = await sendVotingReminder(eventId);
      if (result.error) throw new Error(result.error.message);
      
      toast({
        title: "Erinnerungen versendet",
        description: `${result.data.sent} Personen wurden erinnert.`,
      });
    } catch (e) {
      toast({
        title: "Fehler",
        description: "Erinnerungen konnten nicht gesendet werden.",
        variant: "destructive",
      });
    } finally {
      setReminderLoading(false);
    }
  };

  return (
    <Card className={className + " max-w-xl mx-auto"}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Kommunikation
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Schnelle Aktionen: Einladungen & Voting-Reminder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={handleSendInvites} 
            disabled={invitesLoading}
            size="sm"
            className="rounded-lg gap-2"
            variant="outline"
          >
            {invitesLoading ? (
              "Sende..."
            ) : (
              <>
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Einladungen</span>
                <span className="sm:hidden">Invite</span>
              </>
            )}
          </Button>
          
          <Button 
            onClick={handleSendReminder} 
            disabled={reminderLoading}
            size="sm"
            className="rounded-lg gap-2"
            variant="outline"
          >
            {reminderLoading ? (
              "Sende..."
            ) : (
              <>
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Voting-Reminder</span>
                <span className="sm:hidden">Reminder</span>
              </>
            )}
          </Button>
        </div>

        <details className="text-xs text-muted-foreground rounded-lg border border-border/50 p-2">
          <summary className="cursor-pointer select-none flex items-center gap-1">
            <Info className="h-3.5 w-3.5" />
            <span>Hinweise</span>
          </summary>
          <div className="mt-2 space-y-1">
            <p>• E-Mails werden im Hintergrund asynchron verschickt.</p>
            <p>• Reminder erinnern alle, die noch nicht abgestimmt haben.</p>
          </div>
        </details>

        {children && (
          <div className="pt-2">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}
