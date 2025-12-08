import { useLocation, Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center h-24 w-24 rounded-3xl bg-secondary/50 mb-8">
          <span className="text-5xl font-bold text-primary">404</span>
        </div>
        
        <h1 className="text-2xl font-bold mb-3">Seite nicht gefunden</h1>
        <p className="text-muted-foreground mb-8">
          Die Seite <code className="px-2 py-1 rounded bg-secondary text-sm">{location.pathname}</code> existiert nicht oder wurde verschoben.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="secondary" asChild className="gap-2 rounded-xl">
            <Link to="/" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </Link>
          </Button>
          <Button asChild className="gap-2 rounded-xl">
            <Link to="/">
              <Home className="h-4 w-4" />
              Zur Startseite
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
