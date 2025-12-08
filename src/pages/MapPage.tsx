import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";

export default function MapPage() {
  return (
    <div>
      <PageHeader
        title="Aktivitäten-Karte"
        description="Entdecke Aktivitäten in deiner Region direkt auf der Karte."
      />

      <Card className="rounded-2xl bg-card/60 border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="relative h-[600px] bg-secondary/20 flex flex-col items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary/50 mb-6">
              <MapPin className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Karte in Entwicklung
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm text-center">
              Die interaktive Kartenansicht mit allen Aktivitäten wird in einer späteren Phase implementiert.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
