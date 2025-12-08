// ============================================
// ENUMS
// ============================================

export type EventPhase = "proposal" | "voting" | "scheduling" | "info";

export type EventCategory = 
  | "action" 
  | "food" 
  | "relax" 
  | "party" 
  | "culture" 
  | "outdoor" 
  | "creative";

export type PrimaryGoal = 
  | "teambuilding" 
  | "fun" 
  | "reward" 
  | "celebration" 
  | "networking";

export type Season = 
  | "all_year" 
  | "spring" 
  | "summer" 
  | "autumn" 
  | "winter";

export type Region = 
  | "OOE" 
  | "TIR" 
  | "SBG" 
  | "STMK" 
  | "KTN" 
  | "VBG" 
  | "NOE" 
  | "WIE" 
  | "BGL";

export type RiskLevel = "low" | "medium" | "high";

export type RoomRole = "owner" | "admin" | "member";

export type BudgetType = "total" | "per_person";

export type VoteType = "for" | "against" | "abstain";

export type DateResponseType = "yes" | "no" | "maybe";

// ============================================
// EVENT TIME WINDOW
// ============================================

export type EventTimeWindow =
  | { type: "season"; value: Season }
  | { type: "month"; value: number } // 1–12
  | { type: "weekRange"; fromWeek: number; toWeek: number }
  | { type: "freeText"; value: string };

// ============================================
// DOMAIN TYPES
// ============================================

export interface Room {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  createdAt: string;
  createdByUserId: string;
  avatarUrl?: string;
  members?: RoomMember[];
}

export interface RoomMember {
  userId: string;
  userName: string;
  avatarUrl?: string;
  role: RoomRole;
  joinedAt: string;
}

export interface Activity {
  id: string;
  title: string;
  category: EventCategory;
  tags: string[];
  locationRegion: Region;
  locationCity?: string;
  locationAddress?: string;
  estPricePerPerson: number;
  priceIncludes?: string;
  priceComment?: string;
  shortDescription: string;
  longDescription?: string;
  imageUrl: string;
  galleryUrls?: string[];
  season: Season;
  riskLevel: RiskLevel;
  duration?: string;
  typicalDurationHours?: number;
  groupSizeMin?: number;
  groupSizeMax?: number;
  recommendedGroupSizeMin?: number;
  recommendedGroupSizeMax?: number;
  minParticipants?: number;
  // Scales 1-5
  physicalIntensity?: number;
  mentalChallenge?: number;
  funFactor?: number;
  teamworkLevel?: number;
  creativityLevel?: number;
  socialInteractionLevel?: number;
  competitionLevel?: number;
  // Time & logistics
  travelTimeMinutes?: number;
  travelTimeMinutesWalking?: number;
  leadTimeMinDays?: number;
  preparationNeeded?: string;
  equipmentProvided?: boolean;
  accessibilityFlags?: string[];
  weatherDependent?: boolean;
  // Provider info
  provider?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  // Primary goal
  primaryGoal?: PrimaryGoal;
  // Metadata
  coordinates?: [number, number];
  rating?: number;
  externalRating?: number;
  reviewCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DateOption {
  id: string;
  date: string; // ISO date
  startTime?: string; // HH:mm
  endTime?: string;
  responses: DateResponse[];
}

export interface DateResponse {
  userId: string;
  userName: string;
  response: DateResponseType;
  contribution?: number; // Geldbeitrag in Euro
  note?: string;
}

export interface ActivityVote {
  activityId: string;
  votes: {
    userId: string;
    userName: string;
    vote: VoteType;
    votedAt: string;
  }[];
}

export interface EventParticipant {
  userId: string;
  userName: string;
  avatarUrl?: string;
  isOrganizer: boolean;
  hasVoted: boolean;
  dateResponse?: DateResponseType;
}

export interface Event {
  id: string;
  roomId: string;
  name: string;
  description?: string;
  phase: EventPhase;
  timeWindow: EventTimeWindow;
  votingDeadline: string; // ISO
  budgetType: BudgetType;
  budgetAmount: number;
  participantCountEstimate?: number;
  locationRegion: Region;
  // Voting
  proposedActivityIds: string[];
  activityVotes: ActivityVote[];
  chosenActivityId?: string;
  // Scheduling
  dateOptions: DateOption[];
  finalDateOptionId?: string;
  // Participants
  participants: EventParticipant[];
  // Meta
  createdAt: string;
  createdByUserId: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  department?: string;
  birthday?: string;
  hobbies?: string[];
  favoriteActivityIds?: string[];
}

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
  action: "bg-destructive/20 text-destructive",
  food: "bg-warning/20 text-warning",
  relax: "bg-success/20 text-success",
  party: "bg-primary/20 text-primary",
  culture: "bg-purple-500/20 text-purple-400",
  outdoor: "bg-emerald-500/20 text-emerald-400",
  creative: "bg-pink-500/20 text-pink-400",
};

export const RiskLevelLabels: Record<RiskLevel, string> = {
  low: "Gering",
  medium: "Mittel",
  high: "Hoch",
};

export const RiskLevelColors: Record<RiskLevel, string> = {
  low: "bg-success/20 text-success",
  medium: "bg-warning/20 text-warning",
  high: "bg-destructive/20 text-destructive",
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

export function formatTimeWindow(tw: EventTimeWindow): string {
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
