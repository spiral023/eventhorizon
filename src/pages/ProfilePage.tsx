import { useState } from "react";
import { User, Mail, Building, Calendar, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { EditProfileDialog } from "@/components/shared/EditProfileDialog";

interface UserProfile {
  name: string;
  email: string;
  department: string;
  birthday: string;
  avatarUrl: string;
  hobbies: string[];
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile>({
    name: "Max Mustermann",
    email: "max.mustermann@firma.at",
    department: "Marketing",
    birthday: "15. März",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
    hobbies: ["Wandern", "Fotografie", "Kochen"],
  });

  const handleProfileUpdate = (updatedUser: Omit<UserProfile, "email" | "avatarUrl">) => {
    setUser((prev) => ({
      ...prev,
      ...updatedUser,
    }));
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

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1 rounded-2xl bg-card/60 border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback>
                  <User className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-4 text-xl font-semibold">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.department}</p>
              
              <div className="mt-6 w-full space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Building className="h-4 w-4" />
                  <span>{user.department}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Geburtstag: {user.birthday}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Cards */}
        <div className="md:col-span-2 space-y-6">
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
                {user.hobbies.map((hobby) => (
                  <Badge key={hobby} variant="secondary" className="rounded-lg px-3 py-1">
                    {hobby}
                  </Badge>
                ))}
              </div>
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

          {/* Placeholder for future features */}
          <Card className="rounded-2xl bg-secondary/20 border-dashed border-border/50">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Weitere Profiloptionen werden in Phase 2 ergänzt.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
