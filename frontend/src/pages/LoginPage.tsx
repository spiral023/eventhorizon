import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("max.mustermann@firma.at");
  const [password, setPassword] = useState("demo123");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        toast({
          title: "Willkommen zurück!",
          description: "Du wurdest erfolgreich angemeldet.",
        });
        navigate(from, { replace: true });
      } else {
        toast({
          title: "Login fehlgeschlagen",
          description: "Bitte überprüfe deine Zugangsdaten.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <span className="text-2xl font-bold tracking-tight">
            Event<span className="text-primary">Horizon</span>
          </span>
        </div>

        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-3xl shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Anmelden</CardTitle>
            <CardDescription>
              Melde dich an, um deine Team-Events zu planen
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="max@firma.at"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-xl pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full rounded-xl gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  "Anmelden..."
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Anmelden
                  </>
                )}
              </Button>
            </form>

            {/* Demo Hint */}
            <div className="mt-6 p-4 rounded-xl bg-secondary/30 text-center">
              <p className="text-sm text-muted-foreground">
                <strong>Demo-Modus:</strong> Klicke einfach auf "Anmelden"
                <br />
                (Vorausgefüllte Daten funktionieren)
              </p>
            </div>

            {/* SSO Placeholder */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs text-center text-muted-foreground mb-3">
                Oder anmelden mit
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" className="rounded-xl" disabled>
                  Microsoft SSO
                </Button>
                <Button variant="secondary" className="rounded-xl" disabled>
                  Google SSO
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                (SSO in Entwicklung)
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
