import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

// Previously wrapped children in a motion.div for transitions.
// The extra wrapper is now unnecessary, so we render children directly.
export const PageTransition = ({ children }: PageTransitionProps) => <>{children}</>;
