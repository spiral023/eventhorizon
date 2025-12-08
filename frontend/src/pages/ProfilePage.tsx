import { useState } from "react";
import { User, Mail, Building, Calendar, Heart, Phone, MapPin, Utensils, AlertTriangle, Star, Activity, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { EditProfileDialog } from "@/components/shared/EditProfileDialog";
import { Progress } from "@/components/ui/progress";

export interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  department: string;
  position?: string;
  location?: string;
  birthday: string;
  avatarUrl: string;
  hobbies: string[];
  // Neue Felder
  dietaryRestrictions: string[];
  allergies: string[];
  activityPreferences: {
    physical: number; // 1-5
    mental: number;
    social: number;
    creative: number;
  };
  preferredGroupSize: "small" | "medium" | "large" | "any";
  travelWillingness: "local" | "regional" | "national";
  budgetPreference: "low" | "medium" | "high" | "any";
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  bio?: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile>({
    name: "Max Mustermann",
    email: "max.mustermann@firma.at",
    phone: "+43 664 123 4567",
    department: "Marketing",
    position: "Team Lead",
    location: "Linz",
    birthday: "15. März",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
    hobbies: ["Wandern", "Fotografie", "Kochen"],
    dietaryRestrictions: ["Vegetarisch"],
    allergies: [],
    activityPreferences: {
      physical: 3,
      mental: 4,
      social: 5,
      creative: 2,
    },
    preferredGroupSize: "medium",
    travelWillingness: "regional",
    budgetPreference: "medium",
    emergencyContact: {
      name: "Anna Mustermann",
      phone: "+43 664 987 6543",
      relation: "Partnerin",
    },
    bio: "Begeisterter Teamplayer mit Leidenschaft für kreative Lösungen und Outdoor-Aktivitäten.",
  });

  const handleProfileUpdate = (updatedUser: Partial<UserProfile>) => {
    setUser((prev) => ({
      ...prev,
      ...updatedUser,
    }));
  };

  const groupSizeLabels = {
    small: "Klein (2-5)",
    medium: "Mittel (6-15)",
    large: "Groß (16+)",
    any: "Egal",
  };

  const travelLabels = {
    local: "Lokal (< 30 min)",
    regional: "Regional (< 2h)",
    national: "National",
  };

  const budgetLabels = {
    low: "Günstig (< 30€)",
    medium: "Mittel (30-80€)",
    high: "Premium (80€+)",
    any: "Egal",
  };

  const profileCompleteness = () => {
    let filled = 0;
    const total = 12;
    if (user.name) filled++;
    if (user.email) filled++;
    if (user.phone) filled++;
    if (user.department) filled++;
    if (user.position) filled++;
    if (user.location) filled++;
    if (user.birthday) filled++;
    if (user.hobbies.length > 0) filled++;
    if (user.bio) filled++;
    if (user.dietaryRestrictions.length > 0 || user.allergies.length > 0) filled++;
    if (user.emergencyContact?.name) filled++;
    if (user.activityPreferences) filled++;
    return Math.round((filled / total) * 100);
  };

  return (
    <div>
      <PageHeader
        title="Mein Profil"
        description="Verwalte deine persönlichen Informationen und Präferenzen."
        action={
          <EditProfileDialog user={user} onProfileUpdated={handleProfileUpdate} />
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1 rounded-2xl bg-card/60 border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback>
                  <User className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-4 text-xl font-semibold">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.position} · {user.department}</p>
              
              {user.bio && (
                <p className="mt-3 text-sm text-muted-foreground italic">"{user.bio}"</p>
              )}

              {/* Profile Completeness */}
              <div className="mt-6 w-full">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Profil-Vollständigkeit</span>
                  <span>{profileCompleteness()}%</span>
                </div>
                <Progress value={profileCompleteness()} className="h-2" />
              </div>
              
              <div className="mt-6 w-full space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{user.phone}</span>
                  </div>
                )}
                {user.location && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span>{user.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Building className="h-4 w-4 flex-shrink-0" />
                  <span>{user.department}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>Geburtstag: {user.birthday}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hobbies */}
          <Card className="rounded-2xl bg-card/60 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="h-5 w-5 text-primary" />
                Hobbys & Interessen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user.hobbies.length > 0 ? (
                  user.hobbies.map((hobby) => (
                    <Badge key={hobby} variant="secondary" className="rounded-lg px-3 py-1">
                      {hobby}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Noch keine Hobbys hinzugefügt</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Activity Preferences */}
          <Card className="rounded-2xl bg-card/60 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                Aktivitäts-Präferenzen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Körperlich</span>
                    <span className="text-muted-foreground">{user.activityPreferences.physical}/5</span>
                  </div>
                  <Progress value={user.activityPreferences.physical * 20} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Mental</span>
                    <span className="text-muted-foreground">{user.activityPreferences.mental}/5</span>
                  </div>
                  <Progress value={user.activityPreferences.mental * 20} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Sozial</span>
                    <span className="text-muted-foreground">{user.activityPreferences.social}/5</span>
                  </div>
                  <Progress value={user.activityPreferences.social * 20} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Kreativ</span>
                    <span className="text-muted-foreground">{user.activityPreferences.creative}/5</span>
                  </div>
                  <Progress value={user.activityPreferences.creative * 20} className="h-2" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="outline" className="rounded-lg">
                  <Users className="h-3 w-3 mr-1" />
                  {groupSizeLabels[user.preferredGroupSize]}
                </Badge>
                <Badge variant="outline" className="rounded-lg">
                  <MapPin className="h-3 w-3 mr-1" />
                  {travelLabels[user.travelWillingness]}
                </Badge>
                <Badge variant="outline" className="rounded-lg">
                  <Star className="h-3 w-3 mr-1" />
                  {budgetLabels[user.budgetPreference]}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Dietary & Allergies */}
          <Card className="rounded-2xl bg-card/60 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Utensils className="h-5 w-5 text-primary" />
                Ernährung & Allergien
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Ernährungsweise</p>
                <div className="flex flex-wrap gap-2">
                  {user.dietaryRestrictions.length > 0 ? (
                    user.dietaryRestrictions.map((item) => (
                      <Badge key={item} variant="secondary" className="rounded-lg">
                        {item}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Keine Einschränkungen</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Allergien & Unverträglichkeiten</p>
                <div className="flex flex-wrap gap-2">
                  {user.allergies.length > 0 ? (
                    user.allergies.map((item) => (
                      <Badge key={item} variant="destructive" className="rounded-lg">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {item}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Keine bekannt</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          {user.emergencyContact && (
            <Card className="rounded-2xl bg-card/60 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Notfallkontakt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{user.emergencyContact.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.emergencyContact.name}</p>
                    <p className="text-sm text-muted-foreground">{user.emergencyContact.relation}</p>
                    <p className="text-sm text-muted-foreground">{user.emergencyContact.phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="rounded-2xl bg-card/60 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Schnellaktionen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="secondary" className="justify-start gap-2 rounded-xl">
                  <Mail className="h-4 w-4" />
                  Einladungen senden
                </Button>
                <Button variant="secondary" className="justify-start gap-2 rounded-xl">
                  <Calendar className="h-4 w-4" />
                  Voting-Erinnerung
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
