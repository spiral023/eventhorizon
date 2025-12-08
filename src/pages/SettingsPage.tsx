import { Settings, Moon, Sun, Bell, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/PageHeader";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Einstellungen"
        description="Passe die App an deine Bedürfnisse an."
      />

      <div className="max-w-2xl space-y-6">
        {/* Appearance */}
        <Card className="rounded-2xl bg-card/60 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Moon className="h-5 w-5 text-primary" />
              Erscheinungsbild
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Dunkles Design für augenschonendes Arbeiten
                </p>
              </div>
              <Switch id="dark-mode" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="rounded-2xl bg-card/60 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-primary" />
              Benachrichtigungen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">E-Mail-Benachrichtigungen</Label>
                <p className="text-sm text-muted-foreground">
                  Erhalte Updates zu Events per E-Mail
                </p>
              </div>
              <Switch id="email-notifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="voting-reminders">Voting-Erinnerungen</Label>
                <p className="text-sm text-muted-foreground">
                  Werde an offene Abstimmungen erinnert
                </p>
              </div>
              <Switch id="voting-reminders" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card className="rounded-2xl bg-card/60 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-primary" />
              Sprache & Region
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Spracheinstellungen werden in einer späteren Phase ergänzt.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
