import { useState } from "react";
import { Settings, CalendarIcon, X } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parse, isValid } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { updateUser } from "@/services/apiClient";
import type { UserProfile } from "@/pages/ProfilePage";

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
  const [birthday, setBirthday] = useState<Date | undefined>(
    user.birthday ? new Date(user.birthday) : undefined
  );
  const [birthdayInput, setBirthdayInput] = useState<string>(
    user.birthday ? format(new Date(user.birthday), "dd.MM.yyyy") : ""
  );
  const [bio, setBio] = useState(user.bio || "");
  const [hobbies, setHobbies] = useState<string[]>(user.hobbies);
  const [newHobby, setNewHobby] = useState("");
  
  // Preferences
  const [physical, setPhysical] = useState([user.activityPreferences.physical]);
  const [mental, setMental] = useState([user.activityPreferences.mental]);
  const [social, setSocial] = useState([user.activityPreferences.social]);
  const [creative, setCreative] = useState([user.activityPreferences.creative]);
  const [preferredGroupSize, setPreferredGroupSize] = useState(user.preferredGroupSize);
  const [travelWillingness, setTravelWillingness] = useState(user.travelWillingness);
  const [budgetPreference, setBudgetPreference] = useState(user.budgetPreference);

  const [loading, setLoading] = useState(false);

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
        department: department.trim(),
        position: position.trim() || undefined,
        location: location.trim() || undefined,
        birthday: birthday ? birthday.toISOString().split('T')[0] : undefined,
        bio: bio.trim() || undefined,
        hobbies: hobbies,
        activityPreferences: {
          physical: physical[0],
          mental: mental[0],
          social: social[0],
          creative: creative[0],
        },
        preferredGroupSize: preferredGroupSize,
        travelWillingness: travelWillingness,
        budgetPreference: budgetPreference,
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
        department: department.trim(),
        position: position.trim() || undefined,
        location: location.trim() || undefined,
        birthday: birthday ? birthday.toISOString().split('T')[0] : undefined,
        bio: bio.trim() || undefined,
        hobbies: hobbies,
        activityPreferences: {
          physical: physical[0],
          mental: mental[0],
          social: social[0],
          creative: creative[0],
        },
        preferredGroupSize,
        travelWillingness,
        budgetPreference,
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

            <ScrollArea className="h-[400px] pr-4">
              {/* Basic Info */}
              <TabsContent value="basic" className="space-y-4 mt-0">
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
                    <div className="flex gap-2">
                      <Input
                        id="profile-birthday"
                        placeholder="TT.MM.JJJJ"
                        value={birthdayInput}
                        onChange={(e) => handleBirthdayInputChange(e.target.value)}
                        className="rounded-xl"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="rounded-xl flex-shrink-0"
                          >
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={birthday}
                            onSelect={handleBirthdayCalendarChange}
                            initialFocus
                            locale={de}
                            captionLayout="dropdown-buttons"
                            fromYear={1900}
                            toYear={new Date().getFullYear()}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                          />
                        </PopoverContent>
                      </Popover>
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
              </TabsContent>

              {/* Preferences */}
              <TabsContent value="preferences" className="space-y-6 mt-0">
                <div className="space-y-4">
                  <Label>Aktivitäts-Präferenzen</Label>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Körperliche Aktivität</span>
                        <span className="text-muted-foreground">{physical[0]}/5</span>
                      </div>
                      <Slider value={physical} onValueChange={setPhysical} min={1} max={5} step={1} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Mentale Herausforderung</span>
                        <span className="text-muted-foreground">{mental[0]}/5</span>
                      </div>
                      <Slider value={mental} onValueChange={setMental} min={1} max={5} step={1} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Soziale Interaktion</span>
                        <span className="text-muted-foreground">{social[0]}/5</span>
                      </div>
                      <Slider value={social} onValueChange={setSocial} min={1} max={5} step={1} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Kreativität</span>
                        <span className="text-muted-foreground">{creative[0]}/5</span>
                      </div>
                      <Slider value={creative} onValueChange={setCreative} min={1} max={5} step={1} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Gruppengröße</Label>
                    <Select value={preferredGroupSize} onValueChange={(v: any) => setPreferredGroupSize(v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Klein (2-5)</SelectItem>
                        <SelectItem value="medium">Mittel (6-15)</SelectItem>
                        <SelectItem value="large">Groß (16+)</SelectItem>
                        <SelectItem value="any">Egal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Reisebereitschaft</Label>
                    <Select value={travelWillingness} onValueChange={(v: any) => setTravelWillingness(v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Lokal (&lt; 30 min)</SelectItem>
                        <SelectItem value="regional">Regional (&lt; 2h)</SelectItem>
                        <SelectItem value="national">National</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Budget-Präferenz</Label>
                    <Select value={budgetPreference} onValueChange={(v: any) => setBudgetPreference(v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Günstig (&lt; 30€)</SelectItem>
                        <SelectItem value="medium">Mittel (30-80€)</SelectItem>
                        <SelectItem value="high">Premium (80€+)</SelectItem>
                        <SelectItem value="any">Egal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-4">
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