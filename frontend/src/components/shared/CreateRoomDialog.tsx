import { useState } from "react";
import { Plus } from "lucide-react";
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
import { createRoom } from "@/services/apiClient";
import { toast } from "sonner";
import type { Room } from "@/types/domain";

interface CreateRoomDialogProps {
  onRoomCreated?: (room: Room) => void;
  trigger?: React.ReactNode;
}

export function CreateRoomDialog({ onRoomCreated, trigger }: CreateRoomDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Bitte gib einen Namen ein");
      return;
    }

    setLoading(true);
    try {
      const result = await createRoom({ name: name.trim(), description: description.trim() });
      toast.success("Raum erfolgreich erstellt!");
      onRoomCreated?.(result.data);
      setOpen(false);
      setName("");
      setDescription("");
    } catch (error) {
      toast.error("Fehler beim Erstellen des Raums");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            Neuer Raum
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Neuen Raum erstellen</DialogTitle>
          <DialogDescription>
            Erstelle einen neuen Raum für dein Team oder deine Firma.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="z.B. Marketing-Team"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Beschreibung (optional)</Label>
              <Textarea
                id="description"
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
              {loading ? "Erstelle..." : "Raum erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
