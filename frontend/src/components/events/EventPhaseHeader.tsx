import { Check, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  EventPhase, 
  PhaseLabels, 
  PhaseDescriptions 
} from "@/types/domain";
import { 
  getAllPhases, 
  isPhaseCompleted, 
  isPhaseCurrent, 
  isPhaseUpcoming 
} from "@/utils/phaseStateMachine";

interface EventPhaseHeaderProps {
  currentPhase: EventPhase;
  onPhaseClick?: (phase: EventPhase) => void;
  canAdvance?: boolean;
  onAdvance?: () => void;
  className?: string;
}

export function EventPhaseHeader({ 
  currentPhase, 
  onPhaseClick,
  canAdvance = false,
  onAdvance,
  className 
}: EventPhaseHeaderProps) {
  const phases = getAllPhases();

  return (
    <div className={cn("w-full", className)}>
      {/* Phase Steps */}
      <div className="flex items-center justify-between">
        {phases.map((phase, index) => {
          const isCompleted = isPhaseCompleted(phase, currentPhase);
          const isCurrent = isPhaseCurrent(phase, currentPhase);
          const isUpcoming = isPhaseUpcoming(phase, currentPhase);
          const isLast = index === phases.length - 1;

          return (
            <div key={phase} className="flex items-center flex-1">
              {/* Step */}
              <button
                onClick={() => onPhaseClick?.(phase)}
                disabled={isUpcoming}
                className={cn(
                  "flex flex-col items-center gap-2 relative group w-full",
                  !isUpcoming && "cursor-pointer",
                  isUpcoming && "cursor-not-allowed opacity-50"
                )}
              >
                {/* Circle */}
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 z-10 relative bg-background",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary bg-primary/20 text-primary ring-4 ring-primary/20",
                    isUpcoming && "border-border bg-secondary text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Label */}
                <div className="text-center">
                  <p
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isCurrent && "text-primary",
                      isCompleted && "text-foreground",
                      isUpcoming && "text-muted-foreground"
                    )}
                  >
                    {PhaseLabels[phase]}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block max-w-[120px] mx-auto">
                    {PhaseDescriptions[phase]}
                  </p>
                </div>
              </button>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex-1 h-0.5 bg-border -ml-6 -mr-6 relative top-[-28px] z-0">
                  <div
                    className={cn(
                      "h-full bg-primary transition-all duration-500",
                      isCompleted ? "w-full" : "w-0"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current Phase Info Bar */}
      <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Circle className="h-4 w-4 fill-current" />
            </div>
            <div>
              <p className="font-medium text-primary">
                Aktuelle Phase: {PhaseLabels[currentPhase]}
              </p>
              <p className="text-sm text-muted-foreground">
                {PhaseDescriptions[currentPhase]}
              </p>
            </div>
          </div>
          {canAdvance && onAdvance && (
            <button 
              onClick={onAdvance}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Zur nächsten Phase
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}