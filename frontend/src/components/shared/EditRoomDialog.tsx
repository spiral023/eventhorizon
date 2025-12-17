import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Trash2, Image as ImageIcon, Upload } from "lucide-react";
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
import { deleteRoom, updateRoom, uploadRoomAvatar } from "@/services/apiClient";
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
  const [avatarUrl, setAvatarUrl] = useState(room.avatarUrl || "");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isOwner = user?.id === room.createdByUserId || getRoomRole(room.id) === "owner";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Bitte gib einen Namen ein");
      return;
    }

    setLoading(true);
    try {
      const result = await updateRoom(room.inviteCode, {
        name: name.trim(),
        description: description.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      });
      if (result.error || !result.data) {
        toast.error(result.error?.message || "Fehler beim Aktualisieren des Raums");
        return;
      }

      toast.success("Raum erfolgreich aktualisiert!");
      onRoomUpdated?.(result.data);
      setOpen(false);
    } catch (error) {
      toast.error("Fehler beim Aktualisieren des Raums");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadRoomAvatar(room.inviteCode, file);
      if (result.error || !result.data) {
        toast.error(result.error?.message || "Upload fehlgeschlagen");
        return;
      }
      setAvatarUrl(result.data.avatarUrl || "");
      onRoomUpdated?.(result.data);
      toast.success("Raumbild aktualisiert");
    } catch (error) {
      toast.error("Fehler beim Hochladen");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const result = await deleteRoom(room.inviteCode);
      if (result.error) {
        toast.error(result.error.message || "Fehler beim Löschen des Raums");
        return;
      }

      toast.success("Raum erfolgreich gelöscht!");
      setDeleteDialogOpen(false);
      setOpen(false);
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
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Raum bearbeiten</DialogTitle>
            <DialogDescription>Ändere die Informationen zu deinem Raum.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 rounded-2xl overflow-hidden border border-border/50 bg-secondary/50">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium">Raumbild</p>
                  <p className="text-xs text-muted-foreground">Empfohlen: 256x256, PNG/JPEG/WebP</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-2 rounded-xl"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4" />
                      {uploading ? "Lädt..." : "Bild hochladen"}
                    </Button>
                    {avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => setAvatarUrl("")}
                        disabled={uploading}
                      >
                        Entfernen
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/avif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleAvatarUpload(file);
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              </div>

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

            {isOwner && (
              <div className="border-t border-border/50 pt-4 mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-destructive">Gefahrenzone</p>
                    <p className="text-xs text-muted-foreground">Raum dauerhaft löschen</p>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bist du sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Der Raum "{room.name}" und alle zugehörigen Events werden dauerhaft gelöscht.
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
