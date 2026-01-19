import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface JoinSuccessOverlayProps {
  roomName: string;
  show: boolean;
  onComplete: () => void;
}

export function JoinSuccessOverlay({ roomName, show, onComplete }: JoinSuccessOverlayProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
    if (show) {
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete();
      }, 3000); // Show for 3 seconds
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="flex flex-col items-center p-8 bg-card border rounded-3xl shadow-2xl max-w-sm text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 10 }}
            >
              <CheckCircle className="h-20 w-20 text-green-500 mb-6" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-2">Willkommen!</h2>
            <p className="text-muted-foreground">
              Du bist dem Raum <span className="font-bold text-foreground">{roomName}</span> erfolgreich beigetreten.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
