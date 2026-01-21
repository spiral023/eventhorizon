import { z } from "zod";

// ============================================
// ENUM SCHEMAS
// ============================================

export const EventPhaseSchema = z.enum(["proposal", "voting", "scheduling", "info"]);
export const EventCategorySchema = z.enum([
  "action", "food", "relax", "party"
]);
export const SeasonSchema = z.enum(["all_year", "spring", "summer", "autumn", "winter"]);
export const RegionSchema = z.enum([
  "OOE", "TIR", "SBG", "STMK", "KTN", "VBG", "NOE", "WIE", "BGL"
]);
export const BudgetTypeSchema = z.enum(["total", "per_person"]);
export const RoomRoleSchema = z.enum(["owner", "admin", "member"]);
export const VoteTypeSchema = z.enum(["for", "against", "abstain"]);
export const DateResponseTypeSchema = z.enum(["yes", "no", "maybe"]);
export const PrimaryGoalSchema = z.enum([
  "teambuilding", "fun", "reward"
]);

// ============================================
// COMPOSITE SCHEMAS
// ============================================

export const EventTimeWindowSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("season"), value: SeasonSchema }),
  z.object({ type: z.literal("month"), value: z.number().min(1).max(12) }),
  z.object({ 
    type: z.literal("weekRange"), 
    fromWeek: z.number().min(1).max(53), 
    toWeek: z.number().min(1).max(53) 
  }),
  z.object({ type: z.literal("freeText"), value: z.string().min(1).max(100) }),
]);

// ============================================
// ENTITY SCHEMAS
// ============================================

export const RoomMemberSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  avatarUrl: z.string().optional(),
  role: RoomRoleSchema,
  joinedAt: z.string(),
});

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  inviteCode: z.string(),
  memberCount: z.number(),
  createdAt: z.string(),
  createdByUserId: z.string(),
  avatarUrl: z.string().optional(),
  members: z.array(RoomMemberSchema).optional(),
});

export const ActivitySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string().min(1).max(100),
  category: EventCategorySchema,
  tags: z.array(z.string()),
  locationRegion: RegionSchema,
  locationCity: z.string().optional(),
  locationAddress: z.string().optional(),
  estPricePerPerson: z.number().min(0),
  priceIncludes: z.string().optional(),
  priceComment: z.string().optional(),
  shortDescription: z.string().min(1).max(200),
  longDescription: z.string().optional(),
  customerVoice: z.string().optional(),
  imageUrl: z.string().url(),
  galleryUrls: z.array(z.string().url()).optional(),
  season: SeasonSchema,
  duration: z.string().optional(),
  typicalDurationHours: z.number().optional(),
  groupSizeMin: z.number().min(1).optional(),
  groupSizeMax: z.number().min(1).optional(),
  maxCapacity: z.number().optional(),
  recommendedGroupSizeMin: z.number().optional(),
  recommendedGroupSizeMax: z.number().optional(),
  minParticipants: z.number().optional(),
  // Scales 0-5
  physicalIntensity: z.number().min(0).max(5).optional(),
  mentalChallenge: z.number().min(0).max(5).optional(),
  funFactor: z.number().min(1).max(5).optional(),
  teamworkLevel: z.number().min(1).max(5).optional(),
  socialInteractionLevel: z.number().min(0).max(5).optional(),
  competitionLevel: z.number().min(0).max(5).optional(),
  // Logistics
  travelTimeMinutes: z.number().optional(),
  travelTimeMinutesWalking: z.number().optional(),
  leadTimeMinDays: z.number().optional(),
  preparationNeeded: z.string().optional(),
  equipmentProvided: z.boolean().optional(),
  accessibilityFlags: z.array(z.string()).optional(),
  weatherDependent: z.boolean().optional(),
  accessibilityNotes: z.string().optional(), // kept for compat
  bookingUrl: z.string().url().optional(), // kept for compat
  // Provider
  provider: z.string().optional(),
  website: z.string().optional(),
  reservationUrl: z.string().url().optional(),
  menuUrl: z.string().url().optional(),
  facebook: z.string().url().optional(),
  instagram: z.string().url().optional(),
  outdoorSeating: z.boolean().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  // Meta
  primaryGoal: PrimaryGoalSchema.optional(),
  coordinates: z.tuple([z.number(), z.number()]).optional(),
  rating: z.number().min(0).max(5).optional(),
  externalRating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().optional(),
  favoritesCount: z.number().optional(),
  favoritesInRoomCount: z.number().optional(),
  totalUpvotes: z.number().optional().default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const DateResponseSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  response: DateResponseTypeSchema,
  isPriority: z.boolean().optional(),
  contribution: z.number().optional(),
  note: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export const DateOptionSchema = z.object({
  id: z.string(),
  date: z.string(), // ISO date
  startTime: z.string().optional(), // HH:mm
  endTime: z.string().optional(),
  responses: z.array(DateResponseSchema),
});

export const ActivityVoteSchema = z.object({
  activityId: z.string(),
  votes: z.array(z.object({
    userId: z.string(),
    userName: z.string(),
    vote: VoteTypeSchema,
    votedAt: z.string(),
  })),
});

export const EventParticipantSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  avatarUrl: z.string().optional(),
  isOrganizer: z.boolean(),
  hasVoted: z.boolean(),
  dateResponse: DateResponseTypeSchema.optional(),
});

export const EventSchema = z.object({
  id: z.string(),
  shortCode: z.string(),
  roomId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  phase: EventPhaseSchema,
  timeWindow: EventTimeWindowSchema,
  votingDeadline: z.string(),
  budgetType: BudgetTypeSchema,
  budgetAmount: z.number(),
  participantCountEstimate: z.number().optional(),
  locationRegion: RegionSchema,
  avatarUrl: z.string().optional(),
  inviteSentAt: z.string().optional(),
  lastReminderAt: z.string().optional(),
  unreadMessageCount: z.number().optional(),
  // Voting
  proposedActivityIds: z.array(z.string()),
  excludedActivityIds: z.array(z.string()).optional(),
  activityVotes: z.array(ActivityVoteSchema),
  chosenActivityId: z.string().optional(),
  // Scheduling
  dateOptions: z.array(DateOptionSchema),
  finalDateOptionId: z.string().optional(),
  // Participants
  participants: z.array(EventParticipantSchema),
  // Meta
  createdAt: z.string(),
  createdByUserId: z.string(),
  updatedAt: z.string().optional(),
});

export const UserSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  name: z.string(), // Derived full name
  email: z.string().email(),
  avatarUrl: z.string().optional(),
  phone: z.string().optional(),
  companyId: z.number().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  location: z.string().optional(),
  birthday: z.string().optional(),
  bio: z.string().optional(),
  hobbies: z.array(z.string()).optional(),
  activityPreferences: z.any().optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  favoriteActivityIds: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const CompanySchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  postalCode: z.string(),
  city: z.string(),
  industry: z.string(),
  coordinates: z.tuple([z.number(), z.number()]).optional(),
});

// ============================================
// FORM INPUT SCHEMAS
// ============================================

export const CreateEventSchema = z.object({
  name: z.string()
    .min(3, "Name muss mindestens 3 Zeichen haben")
    .max(100, "Name darf maximal 100 Zeichen haben"),
  description: z.string().max(500).optional(),
  timeWindow: EventTimeWindowSchema,
  fromWeek: z.number().min(1).max(53).optional(),
  toWeek: z.number().min(1).max(53).optional(),
  votingDeadline: z.string().refine(
    (val) => new Date(val) > new Date(),
    "Deadline muss in der Zukunft liegen"
  ),
  budgetType: BudgetTypeSchema,
  budgetAmount: z.number()
    .min(0, "Budget muss positiv sein")
    .max(100000, "Budget zu hoch"),
  participantCountEstimate: z.number().min(2).max(500).optional(),
  locationRegion: RegionSchema,
  proposedActivityIds: z.array(z.string()).min(1, "Mindestens eine Aktivität auswählen"),
});

export type CreateEventInput = z.infer<typeof CreateEventSchema>;

export const CreateDateOptionSchema = z.object({
  date: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export type CreateDateOptionInput = z.infer<typeof CreateDateOptionSchema>;

export const AddDateOptionsSchema = z.object({
  dateOptions: z.array(CreateDateOptionSchema).min(1, "Mindestens einen Termin angeben"),
});

export type AddDateOptionsInput = z.infer<typeof AddDateOptionsSchema>;

export const UserStatsSchema = z.object({
  upcomingEventsCount: z.number(),
  openVotesCount: z.number(),
});

export const EventCommentSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  userId: z.string(),
  content: z.string(),
  phase: EventPhaseSchema,
  createdAt: z.string(),
  userName: z.string().optional(),
  userAvatar: z.string().optional(),
});

export const ActivityCommentSchema = z.object({
  id: z.string(),
  activityId: z.string(),
  userId: z.string(),
  content: z.string(),
  createdAt: z.string(),
  userName: z.string().optional(),
  userAvatar: z.string().optional(),
});
