import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login, register, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedMode = params.get("mode");
    if (requestedMode === "register" || requestedMode === "login") {
      setMode(requestedMode);
    }
  }, [location.search]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === "register" && password !== confirmPassword) {
      toast({
        title: "Passwörter stimmen nicht überein",
        description: "Bitte stelle sicher, dass beide Passwörter identisch sind.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const success =
        mode === "login"
          ? await login(email, password)
          : await register({ email, firstName, lastName, password });

      if (success) {
        toast({
          title: mode === "login" ? "Willkommen zurück!" : "Account erstellt",
          description:
            mode === "login"
              ? "Du wurdest erfolgreich angemeldet."
              : "Dein Account wurde erstellt und du bist jetzt angemeldet.",
        });
        navigate(from, { replace: true });
      } else {
        toast({
          title: mode === "login" ? "Login fehlgeschlagen" : "Registrierung fehlgeschlagen",
          description: "Bitte überprüfe deine Angaben.",
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
            <CardTitle className="text-2xl">
              {mode === "login" ? "Anmelden" : "Registrieren"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Melde dich an, um deine Team-Events zu planen"
                : "Erstelle deinen Account, um loszulegen"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Vorname</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Max"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="rounded-xl"
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nachname</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Mustermann"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="rounded-xl"
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="max.mustermann@firma.at"
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
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
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

              {mode === "register" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="confirmPassword">Passwort wiederholen</Label>
                    {password && confirmPassword && (
                      password === confirmPassword ? (
                        <span className="text-xs text-green-500 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Stimmt überein
                        </span>
                      ) : (
                        <span className="text-xs text-red-500 flex items-center gap-1 font-medium">
                          <XCircle className="h-3 w-3" /> Stimmt nicht überein
                        </span>
                      )
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={cn(
                        "rounded-xl pr-10 transition-colors duration-200",
                        confirmPassword && password === confirmPassword ? "border-green-500 focus-visible:ring-green-500" : ""
                      )}
                      required
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full rounded-xl gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  mode === "login" ? "Anmelden..." : "Registrieren..."
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    {mode === "login" ? "Anmelden" : "Registrieren"}
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  Noch keinen Account?{" "}
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() => setMode("register")}
                  >
                    Jetzt registrieren
                  </button>
                </>
              ) : (
                <>
                  Bereits registriert?{" "}
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() => setMode("login")}
                  >
                    Zum Login
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
