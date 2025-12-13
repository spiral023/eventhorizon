import { Check, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EventPhase,
  PhaseLabels,
  PhaseDescriptions,
} from "@/types/domain";
import {
  getAllPhases,
  isPhaseCompleted,
  isPhaseCurrent,
  isPhaseUpcoming,
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
  className,
}: EventPhaseHeaderProps) {
  const phases = getAllPhases();

  return (
    <div className={cn("w-full", className)}>
      {/* Compact phase pills that wrap on mobile */}
      <div className="flex flex-wrap gap-1.5">
        {phases.map((phase, index) => {
          const isCompleted = isPhaseCompleted(phase, currentPhase);
          const isCurrent = isPhaseCurrent(phase, currentPhase);
          const isUpcoming = isPhaseUpcoming(phase, currentPhase);

          return (
            <button
              key={phase}
              onClick={() => onPhaseClick?.(phase)}
              disabled={isUpcoming}
              className={cn(
                "inline-flex min-w-[128px] items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                "shadow-sm bg-card/70",
                isCompleted && "border-primary/60 bg-primary/10 text-foreground",
                isCurrent && "border-primary bg-primary/15 ring-2 ring-primary/10 text-primary",
                isUpcoming && "border-border/70 text-muted-foreground bg-muted/40",
                !isUpcoming && "hover:border-primary/60 hover:text-primary",
                "disabled:cursor-not-allowed disabled:opacity-70"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md border text-[11px] font-semibold",
                  isCompleted && "border-primary bg-primary text-primary-foreground",
                  isCurrent && "border-primary text-primary bg-primary/20",
                  isUpcoming && "border-border bg-background",
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-[13px] font-medium leading-tight">{PhaseLabels[phase]}</p>
                <p className="truncate text-[11px] text-muted-foreground hidden md:block leading-tight">
                  {PhaseDescriptions[phase]}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Current Phase Info Bar */}
      <div className="mt-2 md:mt-4 p-3 md:p-4 rounded-xl bg-primary/5 border border-primary/15">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Circle className="h-4 w-4 fill-current" />
            </div>
            <div>
              <p className="font-medium text-primary">
                Aktuelle Phase: {PhaseLabels[currentPhase]}
              </p>
              <p className="text-sm text-muted-foreground hidden md:block">
                {PhaseDescriptions[currentPhase]}
              </p>
            </div>
          </div>
          {canAdvance && onAdvance && (
            <button
              onClick={onAdvance}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto justify-center"
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
