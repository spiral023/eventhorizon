import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import * as Sentry from "@sentry/react";
import { toast } from "sonner";

const DevSentryTest = () => {
  const testFrontendError = () => {
    throw new Error("Test Sentry Frontend Integration - This is a test error!");
  };

  const testFrontendMessage = () => {
    Sentry.captureMessage("Test message from EventHorizon Frontend", "info");
    toast.success("Test-Nachricht an Sentry gesendet");
  };

  const testFrontendMetrics = () => {
    if (!Sentry.metrics) {
      toast.error("Sentry Metrics API ist nicht verfuegbar");
      return;
    }

    Sentry.metrics.count("eventhorizon.frontend.dev.count", 1, {
      attributes: {
        source: "ui",
        env: "development",
      },
    });
    Sentry.metrics.distribution("eventhorizon.frontend.dev.latency_ms", 42, {
      unit: "millisecond",
      attributes: {
        source: "ui",
        env: "development",
      },
    });
    Sentry.metrics.gauge("eventhorizon.frontend.dev.gauge", 123, {
      attributes: {
        source: "ui",
        env: "development",
      },
    });

    toast.success("Frontend Metrics an Sentry gesendet");
  };

  const testBackendError = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/dev/sentry/test-error");
      if (!response.ok) {
        toast.error("Backend-Fehler ausgelöst (check Sentry!)");
      }
    } catch (error) {
      toast.error("Fehler beim Aufruf des Backend-Endpoints");
    }
  };

  const testBackendMessage = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/dev/sentry/test-message");
      const data = await response.json();
      toast.success(data.message);
    } catch (error) {
      toast.error("Fehler beim Aufruf des Backend-Endpoints");
    }
  };

  const testBackendTransaction = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/dev/sentry/test-transaction");
      const data = await response.json();
      toast.success(data.message);
    } catch (error) {
      toast.error("Fehler beim Aufruf des Backend-Endpoints");
    }
  };

  return (
    <div className="min-h-screen gradient-bg p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Sentry Integration Tests</h1>
        <p className="text-muted-foreground mb-8">
          Teste die Sentry-Integration für Frontend und Backend
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Frontend Tests */}
          <Card>
            <CardHeader>
              <CardTitle>Frontend Tests</CardTitle>
              <CardDescription>
                Teste Sentry Error Tracking und Messages im Frontend
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={testFrontendError}
                variant="destructive"
                className="w-full"
              >
                Frontend Error auslösen
              </Button>
              <Button
                onClick={testFrontendMessage}
                variant="outline"
                className="w-full"
              >
                Frontend Message senden
              </Button>
              <Button
                onClick={testFrontendMetrics}
                variant="secondary"
                className="w-full"
              >
                Frontend Metrics senden
              </Button>
            </CardContent>
          </Card>

          {/* Backend Tests */}
          <Card>
            <CardHeader>
              <CardTitle>Backend Tests</CardTitle>
              <CardDescription>
                Teste Sentry Error Tracking und Performance Monitoring im Backend
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={testBackendError}
                variant="destructive"
                className="w-full"
              >
                Backend Error auslösen
              </Button>
              <Button
                onClick={testBackendMessage}
                variant="outline"
                className="w-full"
              >
                Backend Message senden
              </Button>
              <Button
                onClick={testBackendTransaction}
                variant="secondary"
                className="w-full"
              >
                Backend Transaction testen
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Anleitung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Stelle sicher, dass SENTRY_DSN und VITE_SENTRY_DSN in deinen .env-Dateien konfiguriert sind</p>
            <p>2. Klicke auf einen der Test-Buttons</p>
            <p>3. Überprüfe dein Sentry-Dashboard auf neue Events</p>
            <p>4. Errors sollten sofort erscheinen, Transactions können einige Sekunden dauern</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DevSentryTest;
