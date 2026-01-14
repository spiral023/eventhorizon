import { useState, useEffect } from "react";
import { User, Mail, Building, Calendar, Heart, Phone, MapPin, Star, Activity, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { EditProfileDialog } from "@/components/shared/EditProfileDialog";
import { Progress } from "@/components/ui/progress";
import { PageLoading } from "@/components/shared/PageLoading";
import { PageError } from "@/components/shared/PageError";
import { getCurrentUser } from "@/services/apiClient";

interface ActivityPreferences {
  physical: number; // 0-5
  mental: number;
  social: number;
  competition: number;
}

export interface UserProfile {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  position?: string;
  location?: string;
  birthday?: string;
  avatarUrl: string;
  hobbies: string[];
  // Neue Felder
  dietaryRestrictions: string[];
  allergies: string[];
  activityPreferences?: ActivityPreferences;
  bio?: string;
}

const normalizeActivityPreferences = (prefs: unknown): ActivityPreferences | undefined => {
  if (!prefs || typeof prefs !== "object") return undefined;
  const raw = prefs as Record<string, unknown>;
  const physical = typeof raw.physical === "number" ? raw.physical : undefined;
  const mental = typeof raw.mental === "number" ? raw.mental : undefined;
  const social = typeof raw.social === "number" ? raw.social : undefined;
  const competition = typeof raw.competition === "number" ? raw.competition : undefined;
  const hasAnyValue = [physical, mental, social, competition].some(
    (value) => typeof value === "number"
  );
  if (!hasAnyValue) return undefined;
  const defaultValue = 3;
  return {
    physical: physical ?? defaultValue,
    mental: mental ?? defaultValue,
    social: social ?? defaultValue,
    competition: competition ?? defaultValue,
  };
};

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getCurrentUser();
      if (result.error) {
        throw new Error(result.error.message);
      }
      if (result.data) {
        // Map API user to UserProfile with default values
        setUser({
          name: result.data.name || `${result.data.firstName} ${result.data.lastName}`.trim(),
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          email: result.data.email,
          phone: result.data.phone,
          department: result.data.department || "",
          position: result.data.position,
          location: result.data.location,
          birthday: result.data.birthday,
          avatarUrl: result.data.avatarUrl || "",
          bio: result.data.bio,
          hobbies: result.data.hobbies || [],
          dietaryRestrictions: result.data.dietaryRestrictions || [],
          allergies: result.data.allergies || [],
          activityPreferences: normalizeActivityPreferences(result.data.activityPreferences),
        });
      }
    } catch (err) {
      setError("Profil konnte nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = (updatedUser: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        ...updatedUser,
      };
    });
  };

  const profileCompleteness = () => {
    if (!user) return 0;
    let filled = 0;
    const total = 10;
    if (user.name) filled++;
    if (user.email) filled++;
    if (user.phone) filled++;
    if (user.department) filled++;
    if (user.position) filled++;
    if (user.location) filled++;
    if (user.birthday) filled++;
    if (user.hobbies.length > 0) filled++;
    if (user.bio) filled++;
    if (user.activityPreferences) filled++;
    return Math.round((filled / total) * 100);
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Mein Profil"
          description="Verwalte deine persönlichen Informationen und Präferenzen."
        />
        <PageLoading />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div>
        <PageHeader
          title="Mein Profil"
          description="Verwalte deine persönlichen Informationen und Präferenzen."
        />
        <PageError message={error || "Profil nicht gefunden"} onRetry={loadUser} />
      </div>
    );
  }

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
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="text-xl font-semibold uppercase">
                  {(user.firstName?.[0] || "") + (user.lastName?.[0] || "") || <User className="h-10 w-10" />}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-4 text-xl font-semibold">{user.name}</h2>
              {(user.position || user.department) && (
                <p className="text-sm text-muted-foreground">
                  {[user.position, user.department].filter(Boolean).join(" · ")}
                </p>
              )}
              
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
                {user.department && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Building className="h-4 w-4 flex-shrink-0" />
                    <span>{user.department}</span>
                  </div>
                )}
                {user.birthday && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>Geburtstag: {new Date(user.birthday).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
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
              {user.activityPreferences ? (
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
                      <span>Wettbewerb</span>
                      <span className="text-muted-foreground">{user.activityPreferences.competition}/5</span>
                    </div>
                    <Progress value={user.activityPreferences.competition * 20} className="h-2" />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Noch keine Präferenzen angegeben.</p>
              )}
            </CardContent>
          </Card>

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
