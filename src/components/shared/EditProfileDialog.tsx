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
import { toast } from "sonner";

interface UserProfile {
  name: string;
  email: string;
  department: string;
  birthday: string;
  hobbies: string[];
}

interface EditProfileDialogProps {
  user: UserProfile;
  onProfileUpdated?: (user: UserProfile) => void;
}

export function EditProfileDialog({ user, onProfileUpdated }: EditProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [department, setDepartment] = useState(user.department);
  const [birthday, setBirthday] = useState(user.birthday);
  const [hobbiesInput, setHobbiesInput] = useState(user.hobbies.join(", "));
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Bitte gib deinen Namen ein");
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const updatedUser: UserProfile = {
        ...user,
        name: name.trim(),
        department: department.trim(),
        birthday: birthday.trim(),
        hobbies: hobbiesInput.split(",").map((h) => h.trim()).filter(Boolean),
      };
      
      toast.success("Profil erfolgreich aktualisiert!");
      onProfileUpdated?.(updatedUser);
      setOpen(false);
    } catch (error) {
      toast.error("Fehler beim Aktualisieren des Profils");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2 rounded-xl">
          <Settings className="h-4 w-4" />
          Bearbeiten
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Profil bearbeiten</DialogTitle>
          <DialogDescription>
            Aktualisiere deine persönlichen Informationen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-department">Abteilung</Label>
              <Input
                id="profile-department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-birthday">Geburtstag</Label>
              <Input
                id="profile-birthday"
                placeholder="z.B. 15. März"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-hobbies">Hobbys (kommagetrennt)</Label>
              <Input
                id="profile-hobbies"
                placeholder="z.B. Wandern, Fotografie, Kochen"
                value={hobbiesInput}
                onChange={(e) => setHobbiesInput(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl">
              {loading ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
