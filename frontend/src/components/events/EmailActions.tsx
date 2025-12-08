import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Bell, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { sendEventInvites, sendVotingReminder } from "@/services/apiClient";

interface EmailActionsProps {
  eventId: string;
  className?: string;
}

export function EmailActions({ eventId, className }: EmailActionsProps) {
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
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Benachrichtigungen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleSendInvites} 
            disabled={invitesLoading}
            className="flex-1 rounded-xl"
            variant="outline"
          >
            {invitesLoading ? (
              "Sende..."
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Einladungen senden
              </>
            )}
          </Button>
          
          <Button 
            onClick={handleSendReminder} 
            disabled={reminderLoading}
            className="flex-1 rounded-xl"
            variant="outline"
          >
            {reminderLoading ? (
              "Sende..."
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Voting-Erinnerung
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          E-Mails werden asynchron im Hintergrund verarbeitet.
        </p>
      </CardContent>
    </Card>
  );
}