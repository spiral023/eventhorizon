import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

export function QrScanner({ onScanSuccess, onScanError }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>("");
  const [isInitializing, setIsInitializing] = useState(false);

  const qrCodeRegionId = "qr-reader";

  const handleStartScanning = async () => {
    setIsInitializing(true);
    setError("");

    try {
      // Create scanner instance if not exists
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(qrCodeRegionId);
      }

      // Request camera permissions and start scanning
      const config = {
        fps: 10, // Frames per second for scanning
        qrbox: { width: 250, height: 250 }, // QR box size
        aspectRatio: 1.0,
      };

      await scannerRef.current.start(
        { facingMode: "environment" }, // Use back camera on mobile
        config,
        (decodedText) => {
          // Success callback
          onScanSuccess(decodedText);
          handleStopScanning();
        },
        (errorMessage) => {
          // Error callback - we can ignore most of these as they're just "no QR code found"
          // Only log actual errors
          if (!errorMessage.includes("NotFoundException")) {
            console.debug("QR scan error:", errorMessage);
          }
        }
      );

      setIsScanning(true);
      setIsInitializing(false);
    } catch (err: unknown) {
      console.error("Error starting QR scanner:", err);
      const errorMsg = (err instanceof Error) ? err.message : "Kamera konnte nicht gestartet werden";
      setError(errorMsg);
      onScanError?.(errorMsg);
      setIsInitializing(false);
    }
  };

  const handleStopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isScanning]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        id={qrCodeRegionId}
        className={`w-full max-w-sm rounded-2xl overflow-hidden ${
          isScanning ? "bg-black" : "bg-secondary/30"
        }`}
        style={{ minHeight: "300px" }}
      />

      {error && (
        <div className="w-full max-w-sm p-3 rounded-xl bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive text-center">{error}</p>
          <p className="text-xs text-destructive/70 text-center mt-1">
            Stelle sicher, dass du Kamerazugriff erlaubt hast.
          </p>
        </div>
      )}

      {!isScanning && !isInitializing && (
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Scanne einen QR-Code, um einem Raum beizutreten
          </p>
          <p className="text-xs text-muted-foreground">
            Du musst Kamerazugriff erlauben
          </p>
        </div>
      )}

      <Button
        onClick={isScanning ? handleStopScanning : handleStartScanning}
        disabled={isInitializing}
        className="rounded-xl gap-2"
        variant={isScanning ? "destructive" : "default"}
      >
        {isInitializing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Initialisiere Kamera...
          </>
        ) : isScanning ? (
          <>
            <CameraOff className="h-4 w-4" />
            Scannen stoppen
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" />
            Kamera starten
          </>
        )}
      </Button>
    </div>
  );
}
