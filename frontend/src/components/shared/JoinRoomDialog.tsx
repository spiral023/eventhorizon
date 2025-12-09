import { useState } from "react";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrScanner } from "@/components/shared/QrScanner";
import { toast } from "sonner";

interface JoinRoomDialogProps {
  trigger?: React.ReactNode;
}

export function JoinRoomDialog({ trigger }: JoinRoomDialogProps) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      toast.error("Bitte gib einen Zugangscode ein");
      return;
    }

    // Validate code format (XXX-XXX-XXX)
    const codePattern = /^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/;
    if (!codePattern.test(cleanCode)) {
      toast.error("Ungültiges Code-Format. Erwartet: XXX-XXX-XXX");
      return;
    }

    setLoading(true);
    // Navigate to join page which handles the actual joining
    navigate(`/join/${cleanCode}`);
    setOpen(false);
    setCode("");
    setLoading(false);
  };

  const handleCodeChange = (value: string) => {
    // Auto-format the code as user types
    let formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (formatted.length > 3 && formatted.length <= 6) {
      formatted = formatted.slice(0, 3) + '-' + formatted.slice(3);
    } else if (formatted.length > 6) {
      formatted = formatted.slice(0, 3) + '-' + formatted.slice(3, 6) + '-' + formatted.slice(6, 9);
    }

    setCode(formatted);
  };

  const handleQrScan = (decodedText: string) => {
    try {
      // Extract invite code from the scanned URL
      // Expected format: http://localhost:5173/join/XXX-XXX-XXX
      const url = new URL(decodedText);
      const pathParts = url.pathname.split('/');

      // Find the invite code (should be after '/join/')
      const joinIndex = pathParts.indexOf('join');
      if (joinIndex !== -1 && pathParts.length > joinIndex + 1) {
        const inviteCode = pathParts[joinIndex + 1];

        // Validate code format
        const codePattern = /^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/;
        if (codePattern.test(inviteCode)) {
          toast.success("QR-Code erfolgreich gescannt!");
          navigate(`/join/${inviteCode}`);
          setOpen(false);
          setCode("");
        } else {
          toast.error("Ungültiger QR-Code: Code-Format nicht erkannt");
        }
      } else {
        toast.error("Ungültiger QR-Code: Kein Einladungscode gefunden");
      }
    } catch (error) {
      toast.error("Ungültiger QR-Code: Keine gültige URL");
    }
  };

  const handleQrError = (error: string) => {
    toast.error(`Scan-Fehler: ${error}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 rounded-xl">
            <LogIn className="h-4 w-4" />
            Raum beitreten
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Raum beitreten</DialogTitle>
          <DialogDescription>
            Tritt einem bestehenden Raum bei, indem du den Zugangscode eingibst oder einen QR-Code scannst.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="code" className="mt-2">
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="code" className="rounded-lg">Zugangscode</TabsTrigger>
            <TabsTrigger value="qr" className="rounded-lg">QR-Code scannen</TabsTrigger>
          </TabsList>

          <TabsContent value="code">
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">Zugangscode</Label>
                  <Input
                    id="code"
                    placeholder="XXX-XXX-XXX"
                    value={code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    className="rounded-xl font-mono text-lg tracking-wider text-center"
                    maxLength={11}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Der Code besteht aus 9 Zeichen im Format XXX-XXX-XXX
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
                  Abbrechen
                </Button>
                <Button type="submit" disabled={loading || code.length < 11} className="rounded-xl">
                  {loading ? "Beitreten..." : "Beitreten"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4 py-4">
            <QrScanner onScanSuccess={handleQrScan} onScanError={handleQrError} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
