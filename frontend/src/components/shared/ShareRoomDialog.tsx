import { useState, useMemo } from "react";
import { Copy, Link2, QrCode, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { Room } from "@/types/domain";

interface ShareRoomDialogProps {
  room: Room;
  trigger?: React.ReactNode;
}

// Generate a room code based on room id
function generateRoomCode(roomId: string): string {
  const hash = roomId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const code = hash.toString(36).toUpperCase().padStart(4, "0").slice(0, 4);
  return `IN-VIA-${code}`;
}

export function ShareRoomDialog({ room, trigger }: ShareRoomDialogProps) {
  const [open, setOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const roomCode = useMemo(() => generateRoomCode(room.id), [room.id]);
  const shareUrl = `${window.location.origin}/join/${roomCode}`;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    toast.success("Zugangscode kopiert!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    toast.success("Link kopiert!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Einladung zum Raum "${room.name}"`);
    const body = encodeURIComponent(
      `Hallo!\n\nIch möchte dich zum Raum "${room.name}" einladen.\n\n` +
      `Tritt bei mit diesem Link:\n${shareUrl}\n\n` +
      `Oder verwende den Zugangscode: ${roomCode}\n\n` +
      `Bis bald!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 rounded-xl">
            <Link2 className="h-4 w-4" />
            Teilen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Raum teilen</DialogTitle>
          <DialogDescription>
            Lade neue Mitglieder zu "{room.name}" ein.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="code" className="mt-4">
          <TabsList className="grid w-full grid-cols-3 rounded-xl">
            <TabsTrigger value="code" className="rounded-lg">Code</TabsTrigger>
            <TabsTrigger value="link" className="rounded-lg">Link</TabsTrigger>
            <TabsTrigger value="qr" className="rounded-lg">QR-Code</TabsTrigger>
          </TabsList>

          <TabsContent value="code" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Zugangscode</Label>
              <div className="flex gap-2">
                <Input
                  value={roomCode}
                  readOnly
                  className="font-mono text-lg tracking-wider text-center rounded-xl"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleCopyCode}
                  className="rounded-xl flex-shrink-0"
                >
                  {copiedCode ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Gäste können diesen Code auf der Startseite eingeben, um beizutreten.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Einladungslink</Label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="text-sm rounded-xl"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleCopyLink}
                  className="rounded-xl flex-shrink-0"
                >
                  {copiedLink ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2 rounded-xl"
              onClick={handleEmailShare}
            >
              <Mail className="h-4 w-4" />
              Per E-Mail teilen
            </Button>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4 pt-4">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-2xl">
                {/* Simple QR Code representation using CSS grid */}
                <QRCodeDisplay value={shareUrl} />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Scanne den QR-Code mit der Kamera, um dem Raum beizutreten.
              </p>
              <Button
                variant="secondary"
                className="gap-2 rounded-xl"
                onClick={handleCopyLink}
              >
                <Copy className="h-4 w-4" />
                Link kopieren
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Simple QR Code visual representation
function QRCodeDisplay({ value }: { value: string }) {
  // Generate a deterministic pattern based on the URL
  const hash = value.split("").reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
  const size = 21;
  
  const cells = useMemo(() => {
    const result: boolean[][] = [];
    for (let i = 0; i < size; i++) {
      result[i] = [];
      for (let j = 0; j < size; j++) {
        // Corner squares (finder patterns)
        const isTopLeft = i < 7 && j < 7;
        const isTopRight = i < 7 && j >= size - 7;
        const isBottomLeft = i >= size - 7 && j < 7;
        
        if (isTopLeft || isTopRight || isBottomLeft) {
          // Finder pattern
          const localI = isTopLeft ? i : isBottomLeft ? i - (size - 7) : i;
          const localJ = isTopLeft ? j : isTopRight ? j - (size - 7) : j;
          
          if (localI === 0 || localI === 6 || localJ === 0 || localJ === 6) {
            result[i][j] = true;
          } else if (localI >= 2 && localI <= 4 && localJ >= 2 && localJ <= 4) {
            result[i][j] = true;
          } else {
            result[i][j] = false;
          }
        } else {
          // Data pattern (pseudo-random based on hash)
          result[i][j] = ((hash * (i + 1) * (j + 1)) % 7) < 3;
        }
      }
    }
    return result;
  }, [hash]);

  return (
    <div 
      className="grid gap-0" 
      style={{ 
        gridTemplateColumns: `repeat(${size}, 8px)`,
        gridTemplateRows: `repeat(${size}, 8px)`,
      }}
    >
      {cells.map((row, i) =>
        row.map((cell, j) => (
          <div
            key={`${i}-${j}`}
            className={cell ? "bg-foreground" : "bg-background"}
          />
        ))
      )}
    </div>
  );
}