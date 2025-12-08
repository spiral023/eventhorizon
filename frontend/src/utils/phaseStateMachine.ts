import type { EventPhase, RoomRole } from "@/types/domain";

// Valid phase transitions
const PHASE_TRANSITIONS: Record<EventPhase, EventPhase[]> = {
  proposal: ["voting"],
  voting: ["scheduling"],
  scheduling: ["info"],
  info: [], // Final phase, no transitions
};

// Roles that can manage events
const EVENT_MANAGER_ROLES: RoomRole[] = ["owner", "admin"];

/**
 * Check if a phase transition is valid
 */
export function canTransition(from: EventPhase, to: EventPhase): boolean {
  return PHASE_TRANSITIONS[from].includes(to);
}

/**
 * Get next possible phase(s) from current phase
 */
export function getNextPhases(current: EventPhase): EventPhase[] {
  return PHASE_TRANSITIONS[current];
}

/**
 * Check if user role can manage event phases
 */
export function canManageEvent(role: RoomRole): boolean {
  return EVENT_MANAGER_ROLES.includes(role);
}

/**
 * Get phase index for progress display (0-3)
 */
export function getPhaseIndex(phase: EventPhase): number {
  const phases: EventPhase[] = ["proposal", "voting", "scheduling", "info"];
  return phases.indexOf(phase);
}

/**
 * Get all phases in order
 */
export function getAllPhases(): EventPhase[] {
  return ["proposal", "voting", "scheduling", "info"];
}

/**
 * Check if phase is completed (before current)
 */
export function isPhaseCompleted(phase: EventPhase, currentPhase: EventPhase): boolean {
  return getPhaseIndex(phase) < getPhaseIndex(currentPhase);
}

/**
 * Check if phase is current
 */
export function isPhaseCurrent(phase: EventPhase, currentPhase: EventPhase): boolean {
  return phase === currentPhase;
}

/**
 * Check if phase is upcoming (after current)
 */
export function isPhaseUpcoming(phase: EventPhase, currentPhase: EventPhase): boolean {
  return getPhaseIndex(phase) > getPhaseIndex(currentPhase);
}

/**
 * Check if voting deadline has passed
 */
export function isVotingDeadlinePassed(deadline: string): boolean {
  return new Date(deadline) < new Date();
}

/**
 * Determine if phase should auto-advance based on deadline
 */
export function shouldAutoAdvance(
  currentPhase: EventPhase,
  votingDeadline: string
): EventPhase | null {
  if (
    (currentPhase === "proposal" || currentPhase === "voting") &&
    isVotingDeadlinePassed(votingDeadline)
  ) {
    return "scheduling";
  }
  return null;
}