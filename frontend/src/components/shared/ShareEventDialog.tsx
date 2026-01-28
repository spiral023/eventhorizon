import { useState } from "react";
import { Copy, Link2, Check, Mail } from "lucide-react";
import QRCode from "react-qr-code";
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
import type { Event } from "@/types/domain";
import { toast } from "sonner";

interface ShareEventDialogProps {
  event: Event;
  trigger?: React.ReactNode;
}

// Format a stable event code like XXX-YYY-ZZZ from the event ID, excluding lookalike chars
const formatEventCode = (id: string) => {
  const clean = id.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const filtered = clean.replace(/[IO10]/g, "");
  const base = (filtered.slice(0, 9) || filtered || "XXXYYYZZZ").padEnd(9, "X");
  return base.match(/.{1,3}/g)?.join("-") || "XXX-YYY-ZZZ";
};

export function ShareEventDialog({ event, trigger }: ShareEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const eventCode = event.shortCode || formatEventCode(event.id);
  const shareUrl = `${window.location.origin}${window.location.pathname}`;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(eventCode);
    setCopiedCode(true);
    toast.success("Event-Code kopiert!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    toast.success("Link kopiert!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Einladung zum Event "${event.name}"`);
    const body = encodeURIComponent(
      `Hi!\n\nIch lade dich zum Event "${event.name}" ein.\n\n` +
      `Code: ${eventCode}\n` +
      `Link: ${shareUrl}\n\n` +
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
            Event teilen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Event teilen</DialogTitle>
          <DialogDescription>
            Teile den Code oder Link, um dem Event beizutreten.
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
              <Label>Event-Code</Label>
              <div className="flex gap-2">
                <Input
                  value={eventCode}
                  readOnly
                  className="font-mono text-lg tracking-widest text-center rounded-xl"
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
                Nutze den Code, um das Event schnell zu teilen (z. B. im Chat).
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
              <div className="bg-white p-6 rounded-2xl">
                <QRCode
                  value={shareUrl}
                  size={200}
                  level="M"
                  fgColor="#000000"
                  bgColor="#ffffff"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                QR scannen oder Code eingeben, um das Event aufzurufen.
              </p>
              <p className="text-xs text-muted-foreground text-center font-mono">
                {shareUrl}
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
