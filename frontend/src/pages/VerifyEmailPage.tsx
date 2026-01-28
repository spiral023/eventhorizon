import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuthStore } from "@/stores/authStore";
import { verifyMagicLink } from "@/lib/authClient";
import { toast } from "sonner";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { refresh } = useAuthStore();
  
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Der Bestätigungslink ist ungültig oder fehlt.");
      return;
    }

    const verify = async () => {
      try {
        const result = await verifyMagicLink(token);
        
        if (result.error) {
          setStatus("error");
          setErrorMessage(result.error.message || "Die Verifizierung ist fehlgeschlagen.");
          return;
        }

        // Success! Refresh the session to get the user logged in
        await refresh();
        setStatus("success");
        
        toast.success("E-Mail bestätigt", {
          description: "Du wurdest erfolgreich angemeldet.",
        });

        // Redirect after a short delay
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 2000);

      } catch (err) {
        setStatus("error");
        setErrorMessage("Ein unerwarteter Fehler ist aufgetreten.");
      }
    };

    verify();
  }, [token, navigate, refresh]);

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
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
            <CardTitle className="text-2xl">E-Mail Bestätigung</CardTitle>
            <CardDescription>
              {status === "verifying" && "Wir überprüfen deinen Link..."}
              {status === "success" && "Deine E-Mail-Adresse wurde bestätigt!"}
              {status === "error" && "Verifizierung fehlgeschlagen"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-6 pb-8 gap-6">
            
            {status === "verifying" && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Bitte warten...</p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-center text-muted-foreground">
                  Du wirst in Kürze weitergeleitet...
                </p>
                <Button 
                  onClick={() => navigate("/", { replace: true })}
                  className="rounded-xl w-full"
                >
                  Jetzt zum Dashboard
                </Button>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center gap-4 w-full">
                <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-center text-destructive font-medium">
                  {errorMessage}
                </p>
                <div className="flex gap-3 w-full">
                  <Button 
                    variant="outline" 
                    asChild
                    className="flex-1 rounded-xl"
                  >
                    <Link to="/login">Zum Login</Link>
                  </Button>
                  <Button 
                    variant="default"
                    asChild
                    className="flex-1 rounded-xl"
                  >
                    <Link to="/login?mode=register">Registrieren</Link>
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
