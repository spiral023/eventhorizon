import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Info, ShieldCheck, Mail, MapPin } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface LegalNoticeDialogProps {
  trigger: React.ReactNode;
}

export function LegalNoticeDialog({ trigger }: LegalNoticeDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 gap-0 border-none bg-background rounded-3xl overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 bg-primary/5 border-b border-border/50">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Rechtliches & Datenschutz
          </DialogTitle>
          <DialogDescription>
            Impressum und Informationen zum Umgang mit deinen Daten
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-8">
            {/* Impressum Section */}
            <section className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Info className="w-5 h-5 text-primary" />
                Impressum
              </h3>
              <div className="bg-secondary/30 p-4 rounded-2xl space-y-3 text-sm border border-border/50">
                <p className="font-semibold text-base">Philipp Asanger</p>
                <div className="flex items-start gap-3 text-muted-foreground">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Karl-Renner-Str. 3<br />
                    4040 Linz<br />
                    Österreich
                  </span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>philipp.asanger@gmail.com</span>
                </div>
              </div>
            </section>

            <Separator className="bg-border/50" />

            {/* Privacy Policy Section */}
            <section className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Datenschutzerklärung
              </h3>
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <div>
                  <h4 className="font-bold text-foreground mb-1">1. Datenerhebung</h4>
                  <p>
                    Wir erheben Daten, die du uns direkt bereitstellst: Name, E-Mail-Adresse, 
                    Profilinformationen (Hobbys, Präferenzen) sowie Daten im Rahmen der Event-Planung (Votings, Kommentare).
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-foreground mb-1">2. Zweck der Verarbeitung</h4>
                  <p>
                    Die Daten werden ausschließlich verwendet, um die Funktionen von EventHorizon bereitzustellen: 
                    Erstellung von Räumen, Planung von Events und die KI-gestützte Analyse von Team-Präferenzen.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-foreground mb-1">3. KI-Dienste (OpenRouter)</h4>
                  <p>
                    Für Analyse-Funktionen werden anonymisierte Präferenzen an KI-Schnittstellen (via OpenRouter) 
                    übermittelt. Es werden keine Klardaten für das Training von Modellen verwendet.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-foreground mb-1">4. Deine Rechte</h4>
                  <p>
                    Du hast jederzeit das Recht auf Auskunft, Berichtigung oder Löschung deiner gespeicherten Daten. 
                    Ein Löschen deines Accounts entfernt alle personenbezogenen Informationen aus unserem System.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
        
        <div className="p-4 bg-secondary/20 border-t border-border/50 text-center text-[10px] text-muted-foreground uppercase tracking-widest">
          EventHorizon &copy; {new Date().getFullYear()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
