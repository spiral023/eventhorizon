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
import type { UserProfile } from "@/pages/ProfilePage";

interface EditProfileDialogProps {
  user: UserProfile;
  onProfileUpdated?: (user: Partial<UserProfile>) => void;
}

const dietaryOptions = [
  "Vegetarisch",
  "Vegan",
  "Pescetarisch",
  "Glutenfrei",
  "Laktosefrei",
  "Halal",
  "Koscher",
  "Low-Carb",
];

const allergyOptions = [
  "Nüsse",
  "Erdnüsse",
  "Milch",
  "Eier",
  "Weizen",
  "Soja",
  "Fisch",
  "Schalentiere",
  "Sesam",
];

export function EditProfileDialog({ user, onProfileUpdated }: EditProfileDialogProps) {
  const [open, setOpen] = useState(false);
  
  // Basic Info
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");
  const [department, setDepartment] = useState(user.department);
  const [position, setPosition] = useState(user.position || "");
  const [location, setLocation] = useState(user.location || "");
  const [birthday, setBirthday] = useState(user.birthday);
  const [bio, setBio] = useState(user.bio || "");
  const [hobbiesInput, setHobbiesInput] = useState(user.hobbies.join(", "));
  
  // Preferences
  const [physical, setPhysical] = useState([user.activityPreferences.physical]);
  const [mental, setMental] = useState([user.activityPreferences.mental]);
  const [social, setSocial] = useState([user.activityPreferences.social]);
  const [creative, setCreative] = useState([user.activityPreferences.creative]);
  const [preferredGroupSize, setPreferredGroupSize] = useState(user.preferredGroupSize);
  const [travelWillingness, setTravelWillingness] = useState(user.travelWillingness);
  const [budgetPreference, setBudgetPreference] = useState(user.budgetPreference);
  
  // Dietary
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(user.dietaryRestrictions);
  const [allergies, setAllergies] = useState<string[]>(user.allergies);
  
  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState(user.emergencyContact?.name || "");
  const [emergencyPhone, setEmergencyPhone] = useState(user.emergencyContact?.phone || "");
  const [emergencyRelation, setEmergencyRelation] = useState(user.emergencyContact?.relation || "");

  const [loading, setLoading] = useState(false);

  const toggleDietary = (item: string) => {
    setDietaryRestrictions((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleAllergy = (item: string) => {
    setAllergies((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Bitte gib deinen Namen ein");
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const updatedUser: Partial<UserProfile> = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        department: department.trim(),
        position: position.trim() || undefined,
        location: location.trim() || undefined,
        birthday: birthday.trim(),
        bio: bio.trim() || undefined,
        hobbies: hobbiesInput.split(",").map((h) => h.trim()).filter(Boolean),
        activityPreferences: {
          physical: physical[0],
          mental: mental[0],
          social: social[0],
          creative: creative[0],
        },
        preferredGroupSize,
        travelWillingness,
        budgetPreference,
        dietaryRestrictions,
        allergies,
        emergencyContact: emergencyName.trim()
          ? {
              name: emergencyName.trim(),
              phone: emergencyPhone.trim(),
              relation: emergencyRelation.trim(),
            }
          : undefined,
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
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="basic">Basis</TabsTrigger>
              <TabsTrigger value="preferences">Präferenzen</TabsTrigger>
              <TabsTrigger value="dietary">Ernährung</TabsTrigger>
              <TabsTrigger value="emergency">Notfall</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] pr-4">
              {/* Basic Info */}
              <TabsContent value="basic" className="space-y-4 mt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="profile-name">Name *</Label>
                    <Input
                      id="profile-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
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
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
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
                    <Label htmlFor="profile-position">Position</Label>
                    <Input
                      id="profile-position"
                      placeholder="z.B. Team Lead"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
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
                  <Label htmlFor="profile-hobbies">Hobbys (kommagetrennt)</Label>
                  <Input
                    id="profile-hobbies"
                    placeholder="z.B. Wandern, Fotografie, Kochen"
                    value={hobbiesInput}
                    onChange={(e) => setHobbiesInput(e.target.value)}
                    className="rounded-xl"
                  />
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

              {/* Dietary */}
              <TabsContent value="dietary" className="space-y-6 mt-0">
                <div className="space-y-3">
                  <Label>Ernährungsweise</Label>
                  <div className="flex flex-wrap gap-2">
                    {dietaryOptions.map((item) => (
                      <Badge
                        key={item}
                        variant={dietaryRestrictions.includes(item) ? "default" : "outline"}
                        className="cursor-pointer rounded-lg"
                        onClick={() => toggleDietary(item)}
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Allergien & Unverträglichkeiten</Label>
                  <div className="flex flex-wrap gap-2">
                    {allergyOptions.map((item) => (
                      <Badge
                        key={item}
                        variant={allergies.includes(item) ? "destructive" : "outline"}
                        className="cursor-pointer rounded-lg"
                        onClick={() => toggleAllergy(item)}
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Wähle alle zutreffenden Allergien aus. Diese Infos helfen bei der Event-Planung.
                  </p>
                </div>
              </TabsContent>

              {/* Emergency Contact */}
              <TabsContent value="emergency" className="space-y-4 mt-0">
                <p className="text-sm text-muted-foreground">
                  Für Notfälle bei Aktivitäten. Diese Daten werden vertraulich behandelt.
                </p>
                
                <div className="grid gap-2">
                  <Label htmlFor="emergency-name">Name des Kontakts</Label>
                  <Input
                    id="emergency-name"
                    placeholder="z.B. Anna Mustermann"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="emergency-phone">Telefonnummer</Label>
                  <Input
                    id="emergency-phone"
                    type="tel"
                    placeholder="+43 664 987 6543"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="emergency-relation">Beziehung</Label>
                  <Input
                    id="emergency-relation"
                    placeholder="z.B. Partner/in, Elternteil, Freund/in"
                    value={emergencyRelation}
                    onChange={(e) => setEmergencyRelation(e.target.value)}
                    className="rounded-xl"
                  />
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
