import { z } from "zod";
import * as Schemas from "@/schemas";
// Import from api.ts, NOT re-exporting
// import type { ApiResult, ApiError, Paginated } from "./api"; 

// ============================================
// DERIVED TYPES
// ============================================

export type EventPhase = z.infer<typeof Schemas.EventPhaseSchema>;
export type EventCategory = z.infer<typeof Schemas.EventCategorySchema>;
export type Season = z.infer<typeof Schemas.SeasonSchema>;
export type Region = z.infer<typeof Schemas.RegionSchema>;
export type RoomRole = z.infer<typeof Schemas.RoomRoleSchema>;
export type BudgetType = z.infer<typeof Schemas.BudgetTypeSchema>;
export type VoteType = z.infer<typeof Schemas.VoteTypeSchema>;
export type DateResponseType = z.infer<typeof Schemas.DateResponseTypeSchema>;
export type PrimaryGoal = z.infer<typeof Schemas.PrimaryGoalSchema>;

export type EventTimeWindow = z.infer<typeof Schemas.EventTimeWindowSchema>;

export type Room = z.infer<typeof Schemas.RoomSchema>;
export type RoomMember = z.infer<typeof Schemas.RoomMemberSchema>;
export type Activity = z.infer<typeof Schemas.ActivitySchema>;
export type DateOption = z.infer<typeof Schemas.DateOptionSchema>;
export type DateResponse = z.infer<typeof Schemas.DateResponseSchema>;
export type ActivityVote = z.infer<typeof Schemas.ActivityVoteSchema>;
export type EventParticipant = z.infer<typeof Schemas.EventParticipantSchema>;
export type Event = z.infer<typeof Schemas.EventSchema>;
export type User = z.infer<typeof Schemas.UserSchema>;
export type UserStats = z.infer<typeof Schemas.UserStatsSchema>;
export type EventComment = z.infer<typeof Schemas.EventCommentSchema>;
export type ActivityComment = z.infer<typeof Schemas.ActivityCommentSchema>;

// ============================================
// UI HELPERS
// ============================================

export const CategoryLabels: Record<EventCategory, string> = {
  action: "Action",
  food: "Essen & Trinken",
  relax: "Entspannung",
  party: "Party",
  culture: "Kultur",
  outdoor: "Outdoor",
  creative: "Kreativ",
};

export const RegionLabels: Record<Region, string> = {
  OOE: "Oberösterreich",
  TIR: "Tirol",
  SBG: "Salzburg",
  STMK: "Steiermark",
  KTN: "Kärnten",
  VBG: "Vorarlberg",
  NOE: "Niederösterreich",
  WIE: "Wien",
  BGL: "Burgenland",
};

export const SeasonLabels: Record<Season, string> = {
  all_year: "Ganzjährig",
  spring: "Frühling",
  summer: "Sommer",
  autumn: "Herbst",
  winter: "Winter",
};

export const PhaseLabels: Record<EventPhase, string> = {
  proposal: "Vorschläge",
  voting: "Abstimmung",
  scheduling: "Terminfindung",
  info: "Event-Info",
};

export const PhaseDescriptions: Record<EventPhase, string> = {
  proposal: "Aktivitäten für das Event vorschlagen",
  voting: "Über die Vorschläge abstimmen",
  scheduling: "Passenden Termin finden",
  info: "Alle Details auf einen Blick",
};

export const CategoryColors: Record<EventCategory, string> = {
  action: "bg-destructive text-destructive-foreground shadow-sm shadow-destructive/30 ring-1 ring-white/15 backdrop-blur-sm",
  food: "bg-warning text-warning-foreground shadow-sm shadow-warning/30 ring-1 ring-white/15 backdrop-blur-sm",
  relax: "bg-success text-success-foreground shadow-sm shadow-success/30 ring-1 ring-white/15 backdrop-blur-sm",
  party: "bg-primary text-primary-foreground shadow-sm shadow-primary/30 ring-1 ring-white/15 backdrop-blur-sm",
  culture: "bg-purple-600 text-white shadow-sm shadow-purple-500/30 ring-1 ring-white/15 backdrop-blur-sm",
  outdoor: "bg-emerald-600 text-white shadow-sm shadow-emerald-500/30 ring-1 ring-white/15 backdrop-blur-sm",
  creative: "bg-pink-600 text-white shadow-sm shadow-pink-500/30 ring-1 ring-white/15 backdrop-blur-sm",
};

export const MonthLabels: Record<number, string> = {
  1: "Januar",
  2: "Februar",
  3: "März",
  4: "April",
  5: "Mai",
  6: "Juni",
  7: "Juli",
  8: "August",
  9: "September",
  10: "Oktober",
  11: "November",
  12: "Dezember",
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function formatTimeWindow(tw: EventTimeWindow | undefined | null): string {
  if (!tw) {
    return "Zeitraum nicht festgelegt";
  }
  switch (tw.type) {
    case "season":
      return SeasonLabels[tw.value];
    case "month":
      return MonthLabels[tw.value] || `Monat ${tw.value}`;
    case "weekRange":
      return `KW ${tw.fromWeek}–${tw.toWeek}`;
    case "freeText":
      return tw.value;
  }
}

export function formatBudget(amount: number, type: BudgetType): string {
  const formatted = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
  return type === "per_person" ? `${formatted} p.P.` : formatted;
}
