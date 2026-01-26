import { useRef, useState } from "react";
import { Settings, X, User } from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parse, isValid } from "date-fns";
import { de } from "date-fns/locale";
import { updateUser, uploadAvatar } from "@/services/apiClient";
import type { UserProfile } from "@/pages/ProfilePage";
import { useAuthStore } from "@/stores/authStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CompanyAutocomplete } from "@/components/shared/CompanyAutocomplete";
import { Checkbox } from "@/components/ui/checkbox";

interface EditProfileDialogProps {
  user: UserProfile;
  onProfileUpdated?: (user: Partial<UserProfile>) => void;
}

export function EditProfileDialog({ user, onProfileUpdated }: EditProfileDialogProps) {
  const [open, setOpen] = useState(false);
  
  // Basic Info
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone || "");
  const [department, setDepartment] = useState(user.department);
  const [position, setPosition] = useState(user.position || "");
  const [location, setLocation] = useState(user.location || "");
  const [companyId, setCompanyId] = useState<number | null>(user.companyId ?? null);
  const [birthday, setBirthday] = useState<Date | undefined>(
    user.birthday ? new Date(user.birthday) : undefined
  );
  const [birthdayInput, setBirthdayInput] = useState<string>(
    user.birthday ? format(new Date(user.birthday), "dd.MM.yyyy") : ""
  );
  const [isBirthdayPrivate, setIsBirthdayPrivate] = useState(user.isBirthdayPrivate);
  const [bio, setBio] = useState(user.bio || "");
  const [hobbies, setHobbies] = useState<string[]>(user.hobbies);
  const [newHobby, setNewHobby] = useState("");
  
  // Preferences
  const [physical, setPhysical] = useState([user.activityPreferences?.physical ?? 3]);
  const [mental, setMental] = useState([user.activityPreferences?.mental ?? 3]);
  const [social, setSocial] = useState([user.activityPreferences?.social ?? 3]);
  const [competition, setCompetition] = useState([user.activityPreferences?.competition ?? 3]);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");

  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const refreshAuth = useAuthStore((state) => state.refresh);

  const handleBirthdayInputChange = (value: string) => {
    setBirthdayInput(value);

    // Try to parse the date in format dd.MM.yyyy
    const parsedDate = parse(value, "dd.MM.yyyy", new Date());

    if (isValid(parsedDate) && parsedDate <= new Date() && parsedDate >= new Date("1900-01-01")) {
      setBirthday(parsedDate);
    }
  };

  const handleBirthdayCalendarChange = (date: Date | undefined) => {
    setBirthday(date);
    setBirthdayInput(date ? format(date, "dd.MM.yyyy") : "");
  };

  const addHobby = () => {
    const trimmed = newHobby.trim();
    if (trimmed && !hobbies.includes(trimmed)) {
      setHobbies([...hobbies, trimmed]);
      setNewHobby("");
    }
  };

  const removeHobby = (hobbyToRemove: string) => {
    setHobbies(hobbies.filter((h) => h !== hobbyToRemove));
  };

  const handleHobbyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addHobby();
    }
  };

  const handleAvatarFile = async (file: File) => {
    const maxMb = 5;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Datei ist zu groß. Max. ${maxMb}MB.`);
      return;
    }
    setAvatarLoading(true);
    const result = await uploadAvatar(file);
    if (result.error || !result.data) {
      toast.error(result.error?.message || "Upload fehlgeschlagen");
      setAvatarLoading(false);
      return;
    }
    setAvatarUrl(result.data.avatarUrl || "");
    onProfileUpdated?.({
      avatarUrl: result.data.avatarUrl || "",
      name: result.data.name,
      firstName: result.data.firstName,
      lastName: result.data.lastName,
    });
    refreshAuth(); // Sync global user state
    toast.success("Profilbild aktualisiert");
    setAvatarLoading(false);
  };

  const handleRemoveAvatar = async () => {
    setAvatarLoading(true);
    const result = await updateUser({ avatarUrl: "" });
    if (result.error) {
      toast.error(result.error.message || "Profilbild konnte nicht entfernt werden");
      setAvatarLoading(false);
      return;
    }
    setAvatarUrl("");
    onProfileUpdated?.({
      avatarUrl: "",
    });
    refreshAuth();
    toast.success("Profilbild entfernt");
    setAvatarLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Bitte gib deinen Vor- und Nachnamen ein");
      return;
    }

    setLoading(true);
    try {
      // Call API to update user
      const result = await updateUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        companyId,
        department: department.trim(),
        position: position.trim() || undefined,
        location: location.trim() || undefined,
        birthday: birthday ? format(birthday, "yyyy-MM-dd") : undefined,
        isBirthdayPrivate: isBirthdayPrivate,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
        hobbies: hobbies,
        activityPreferences: {
          physical: physical[0],
          mental: mental[0],
          social: social[0],
          competition: competition[0],
        },
      });

      if (result.error) {
        toast.error(result.error.message || "Fehler beim Aktualisieren des Profils");
        return;
      }

      // Update local state with additional fields that aren't stored in DB yet
      const updatedUser: Partial<UserProfile> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`,
        phone: phone.trim() || undefined,
        companyId,
        department: department.trim(),
        position: position.trim() || undefined,
        location: location.trim() || undefined,
        birthday: birthday ? format(birthday, "yyyy-MM-dd") : undefined,
        isBirthdayPrivate: isBirthdayPrivate,
        bio: bio.trim() || undefined,
        hobbies: hobbies,
        activityPreferences: {
          physical: physical[0],
          mental: mental[0],
          social: social[0],
          competition: competition[0],
        },
        avatarUrl: avatarUrl || undefined,
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

  const handleResetProfile = async () => {
    if (!window.confirm("Bist du sicher? Dies setzt alle Präferenzen, Hobbys und das Profilbild zurück. Name und Email bleiben erhalten.")) {
      return;
    }

    setLoading(true);
    try {
      // Use explicit null (casted to any) or empty values to clear fields
      const result = await updateUser({
        phone: "",
        companyId: null,
        department: "",
        position: "",
        location: "",
        birthday: null as unknown as string,
        bio: "",
        avatarUrl: "",
        hobbies: [],
        activityPreferences: {
          physical: 3,
          mental: 3,
          social: 3,
          competition: 3,
        },
      });

      if (result.error) {
        toast.error(result.error.message || "Fehler beim Zurücksetzen");
        return;
      }

      // Update local state variables to reflect the reset
      setPhone("");
      setCompanyId(null);
      setDepartment("");
      setPosition("");
      setLocation("");
      setBirthday(undefined);
      setBirthdayInput("");
      setIsBirthdayPrivate(false);
      setBio("");
      setHobbies([]);
      setPhysical([3]);
      setMental([3]);
      setSocial([3]);
      setCompetition([3]);
      setAvatarUrl("");
      
      // Update parent/global state
      if (result.data) {
        onProfileUpdated?.(result.data);
      }
      refreshAuth();

      toast.success("Profil erfolgreich zurückgesetzt!");
    } catch (error) {
      console.error("Reset profile error:", error);
      toast.error("Fehler beim Zurücksetzen des Profils");
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Profil bearbeiten</DialogTitle>
          <DialogDescription>
            Aktualisiere deine persönlichen Informationen und Präferenzen.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="basic">Basis</TabsTrigger>
              <TabsTrigger value="preferences">Präferenzen</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] pl-1 pr-4">
              {/* Basic Info */}
              <TabsContent value="basic" className="space-y-4 mt-0 p-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleAvatarFile(file);
                    }
                    // reset input to allow re-selecting same file
                    e.target.value = "";
                  }}
                />

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-dashed border-border/70 p-4 bg-muted/40">
                  <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                    <AvatarImage src={avatarUrl || user.avatarUrl} />
                    <AvatarFallback>
                      <User className="h-7 w-7" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Profilbild</div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="rounded-xl"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarLoading}
                      >
                        {avatarLoading ? "Lädt..." : "Bild auswählen"}
                      </Button>
                      {avatarUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-xl"
                          onClick={handleRemoveAvatar}
                          disabled={avatarLoading}
                        >
                          Bild entfernen
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PNG/JPG/WebP, max. 5 MB. Neues Bild wird sofort gespeichert.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="profile-firstname">Vorname *</Label>
                    <Input
                      id="profile-firstname"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="profile-lastname">Nachname *</Label>
                    <Input
                      id="profile-lastname"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <CompanyAutocomplete
                    id="profile-company"
                    label="Firma"
                    value={companyId}
                    onChange={setCompanyId}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="profile-phone">Telefon</Label>
                    <Input
                      id="profile-phone"
                      type="tel"
                      placeholder="+43 664 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
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
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="profile-position">Position</Label>
                    <Input
                      id="profile-position"
                      placeholder="z.B. Team Lead"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="profile-location">Standort</Label>
                    <Input
                      id="profile-location"
                      placeholder="z.B. Linz"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="profile-birthday">Geburtstag (optional)</Label>
                    <Input
                      id="profile-birthday"
                      placeholder="TT.MM.JJJJ"
                      value={birthdayInput}
                      onChange={(e) => handleBirthdayInputChange(e.target.value)}
                      className="rounded-xl"
                    />
                    <div className="flex items-center space-x-2 mt-1">
                      <Checkbox
                        id="profile-birthday-privacy"
                        checked={isBirthdayPrivate}
                        onCheckedChange={(checked) => setIsBirthdayPrivate(checked as boolean)}
                      />
                      <Label htmlFor="profile-birthday-privacy" className="text-xs text-muted-foreground font-normal cursor-pointer">
                        Geburtstag nicht in "Geburtstage" anzeigen
                      </Label>
                    </div>
                  </div>
                  {/* Empty placeholder to keep grid balanced if needed, or just let it flow */}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="profile-bio">Über mich</Label>
                  <Textarea
                    id="profile-bio"
                    placeholder="Ein paar Worte über dich..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="rounded-xl resize-none"
                    rows={3}
                  />
                </div>
              </TabsContent>

              {/* Preferences */}
              <TabsContent value="preferences" className="space-y-6 mt-0 p-1">
                <div className="grid gap-2">
                  <Label htmlFor="profile-hobbies">Hobbys</Label>
                  <div className="flex gap-2">
                    <Input
                      id="profile-hobbies"
                      placeholder="z.B. Wandern"
                      value={newHobby}
                      onChange={(e) => setNewHobby(e.target.value)}
                      onKeyDown={handleHobbyKeyDown}
                      className="rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addHobby}
                      className="rounded-xl flex-shrink-0"
                    >
                      Hinzufügen
                    </Button>
                  </div>
                  {hobbies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {hobbies.map((hobby) => (
                        <Badge
                          key={hobby}
                          variant="secondary"
                          className="rounded-lg px-3 py-1 flex items-center gap-1"
                        >
                          {hobby}
                          <button
                            type="button"
                            onClick={() => removeHobby(hobby)}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label>Aktivitäts-Präferenzen</Label>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Körperliche Aktivität</span>
                        <span className="text-muted-foreground">{physical[0]}/5</span>
                      </div>
                      <Slider value={physical} onValueChange={setPhysical} min={0} max={5} step={1} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Mentale Herausforderung</span>
                        <span className="text-muted-foreground">{mental[0]}/5</span>
                      </div>
                      <Slider value={mental} onValueChange={setMental} min={0} max={5} step={1} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Soziale Interaktion</span>
                        <span className="text-muted-foreground">{social[0]}/5</span>
                      </div>
                      <Slider value={social} onValueChange={setSocial} min={0} max={5} step={1} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Wettbewerbslevel</span>
                        <span className="text-muted-foreground">{competition[0]}/5</span>
                      </div>
                      <Slider value={competition} onValueChange={setCompetition} min={0} max={5} step={1} />
                    </div>
                  </div>
                </div>

              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-4 flex sm:justify-between flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleResetProfile}
              disabled={loading}
              className="rounded-xl sm:mr-auto"
            >
              Profil zurücksetzen
            </Button>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
                Abbrechen
              </Button>
              <Button type="submit" disabled={loading} className="rounded-xl">
                {loading ? "Speichern..." : "Speichern"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
