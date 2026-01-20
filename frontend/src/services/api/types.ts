import type { Activity, Event, EventCategory, PrimaryGoal, Room, User } from "@/types/domain";

export interface AvatarUploadInfo {
  uploadUrl: string;
  publicUrl: string;
  uploadKey: string;
}

export interface RoomMember {
  id: string;
  name: string;
  email: string;
  username: string;
  avatarUrl?: string;
  role: string;
  joinedAt: string;
}

export interface TeamPreferenceSummary {
  categoryDistribution: { category: EventCategory; percentage: number; count: number }[];
  preferredGoals: PrimaryGoal[];
  recommendedActivityIds: string[];
  teamVibe: "action" | "relax" | "mixed";
  synergyScore: number;
  strengths: string[];
  challenges: string[];
  teamPersonality: string;
  socialVibe: "low" | "medium" | "high";
  insights: string[];
  memberCount: number;
  teamPreferences?: {
    physical?: number;
    mental?: number;
    social?: number;
    competition?: number;
  };
  favoritesParticipation?: {
    count: number;
    total: number;
    percentage: number;
  };
  preferencesCoverage?: {
    count: number;
    total: number;
    percentage: number;
  };
}

export interface AiRecommendation {
  activityId: string;
  score: number;
  reason: string;
}

export interface BookingRequestInput {
  participantCount: number;
  requestedDate: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
}

export interface SearchResult {
  activities: Activity[];
  rooms: Room[];
  events: Event[];
  users: User[];
}
