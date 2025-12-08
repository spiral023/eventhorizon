import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PageErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function PageError({ message = "Ein Fehler ist aufgetreten.", onRetry }: PageErrorProps) {
  return (
    <div className="py-8 space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fehler</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Erneut versuchen
        </Button>
      )}
    </div>
  );
}
