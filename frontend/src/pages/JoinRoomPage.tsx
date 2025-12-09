import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { joinRoom } from "@/services/apiClient";
import { useAuthStore } from "@/stores/authStore";

export default function JoinRoomPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, setRoomRole } = useAuthStore();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [roomName, setRoomName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login', {
        state: { from: { pathname: `/join/${inviteCode}` } }
      });
      return;
    }

    // Join the room
    const join = async () => {
      if (!inviteCode) {
        setStatus("error");
        setErrorMessage("Kein Zugangscode angegeben");
        return;
      }

      const result = await joinRoom(inviteCode);

      if (result.error) {
        setStatus("error");
        setErrorMessage(result.error.message || "Raum konnte nicht beigetreten werden");
      } else if (result.data) {
        setStatus("success");
        setRoomName(result.data.name);
        // Set room role as member for joined rooms
        setRoomRole(result.data.id, "member");
        // Redirect to the room after a short delay
        setTimeout(() => {
          navigate(`/rooms/${result.data.id}`, { replace: true });
        }, 1500);
      }
    };

    join();
  }, [inviteCode, isAuthenticated, navigate, setRoomRole]);

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
            <CardTitle className="text-2xl">Raum beitreten</CardTitle>
            <CardDescription>
              {status === "loading" && "Einen Moment bitte..."}
              {status === "success" && "Erfolgreich beigetreten!"}
              {status === "error" && "Fehler beim Beitreten"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col items-center justify-center py-8">
              {status === "loading" && (
                <>
                  <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                  <p className="text-sm text-muted-foreground text-center">
                    Raum mit Code <span className="font-mono font-bold">{inviteCode}</span> wird beigetreten...
                  </p>
                </>
              )}

              {status === "success" && (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  >
                    <CheckCircle className="h-16 w-16 text-success mb-4" />
                  </motion.div>
                  <p className="text-lg font-semibold mb-2">Willkommen!</p>
                  <p className="text-sm text-muted-foreground text-center">
                    Du bist dem Raum <span className="font-bold text-foreground">{roomName}</span> beigetreten.
                  </p>
                  <p className="text-xs text-muted-foreground mt-4">
                    Du wirst weitergeleitet...
                  </p>
                </>
              )}

              {status === "error" && (
                <>
                  <XCircle className="h-16 w-16 text-destructive mb-4" />
                  <p className="text-lg font-semibold mb-2">Fehler</p>
                  <p className="text-sm text-muted-foreground text-center mb-6">
                    {errorMessage}
                  </p>
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl"
                      onClick={() => navigate('/rooms')}
                    >
                      Zu meinen Räumen
                    </Button>
                    <Button
                      className="flex-1 rounded-xl"
                      onClick={() => window.location.reload()}
                    >
                      Erneut versuchen
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
