import { useState } from "react";
import { Settings } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Room } from "@/types/domain";

interface EditRoomDialogProps {
  room: Room;
  onRoomUpdated?: (room: Room) => void;
  trigger?: React.ReactNode;
}

export function EditRoomDialog({ room, onRoomUpdated, trigger }: EditRoomDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Bitte gib einen Namen ein");
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const updatedRoom: Room = {
        ...room,
        name: name.trim(),
        description: description.trim() || undefined,
      };
      
      toast.success("Raum erfolgreich aktualisiert!");
      onRoomUpdated?.(updatedRoom);
      setOpen(false);
    } catch (error) {
      toast.error("Fehler beim Aktualisieren des Raums");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="secondary" size="icon" className="rounded-xl">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Raum bearbeiten</DialogTitle>
          <DialogDescription>
            Ändere die Informationen zu deinem Raum.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                placeholder="z.B. Marketing-Team"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Beschreibung (optional)</Label>
              <Textarea
                id="edit-description"
                placeholder="Wofür ist dieser Raum gedacht?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl">
              {loading ? "Speichere..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}