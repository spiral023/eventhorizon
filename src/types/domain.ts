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

// ============================================
// DOMAIN TYPES
// ============================================

export interface Room {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  createdAt: string; // ISO date
  createdByUserId: string;
  avatarUrl?: string;
}

export interface Activity {
  id: string;
  title: string;
  category: EventCategory;
  tags: string[];
  locationRegion: Region;
  estPricePerPerson: number;
  shortDescription: string;
  imageUrl: string;
  season?: Season;
  riskLevel?: RiskLevel;
  duration?: string; // e.g., "2-3 Stunden"
  groupSizeMin?: number;
  groupSizeMax?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  department?: string;
  birthday?: string;
  hobbies?: string[];
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

export const CategoryColors: Record<EventCategory, string> = {
  action: "bg-destructive/20 text-destructive",
  food: "bg-warning/20 text-warning",
  relax: "bg-success/20 text-success",
  party: "bg-primary/20 text-primary",
  culture: "bg-purple-500/20 text-purple-400",
  outdoor: "bg-emerald-500/20 text-emerald-400",
  creative: "bg-pink-500/20 text-pink-400",
};
