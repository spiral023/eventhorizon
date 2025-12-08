import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Trash2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { deleteRoom } from "@/services/apiClient";
import { useAuthStore } from "@/stores/authStore";
import type { Room } from "@/types/domain";

interface EditRoomDialogProps {
  room: Room;
  onRoomUpdated?: (room: Room) => void;
  trigger?: React.ReactNode;
}

export function EditRoomDialog({ room, onRoomUpdated, trigger }: EditRoomDialogProps) {
  const navigate = useNavigate();
  const { user, getRoomRole } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description || "");
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Check if current user is the room owner
  const isOwner = user?.id === room.createdByUserId || getRoomRole(room.id) === "owner";

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

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const result = await deleteRoom(room.id);
      if (result.error) {
        toast.error(result.error.message || "Fehler beim Löschen des Raums");
        return;
      }

      toast.success("Raum erfolgreich gelöscht!");
      setDeleteDialogOpen(false);
      setOpen(false);
      // Navigate to rooms list after deletion
      navigate("/rooms");
    } catch (error) {
      toast.error("Fehler beim Löschen des Raums");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
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

            {/* Delete Section - Only visible to room owner */}
            {isOwner && (
              <div className="border-t border-border/50 pt-4 mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-destructive">Gefahrenzone</p>
                    <p className="text-xs text-muted-foreground">
                      Raum dauerhaft löschen
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="rounded-xl gap-2"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Löschen
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter className="mt-4">
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bist du sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Der Raum "{room.name}"
              und alle zugehörigen Events werden dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Lösche..." : "Raum löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}