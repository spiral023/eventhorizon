import { ReactNode } from "react";
import { motion } from "framer-motion";
import { MOTION } from "@/lib/motion";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition = ({ children, className }: PageTransitionProps) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={MOTION.page}
  >
    {children}
  </motion.div>
);
