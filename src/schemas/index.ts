import { z } from "zod";

// ============================================
// ENUM SCHEMAS
// ============================================

export const EventPhaseSchema = z.enum(["proposal", "voting", "scheduling", "info"]);

export const EventCategorySchema = z.enum([
  "action", "food", "relax", "party", "culture", "outdoor", "creative"
]);

export const SeasonSchema = z.enum(["all_year", "spring", "summer", "autumn", "winter"]);

export const RegionSchema = z.enum([
  "OOE", "TIR", "SBG", "STMK", "KTN", "VBG", "NOE", "WIE", "BGL"
]);

export const RiskLevelSchema = z.enum(["low", "medium", "high"]);

export const BudgetTypeSchema = z.enum(["total", "per_person"]);

// ============================================
// EVENT TIME WINDOW SCHEMA
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
// ACTIVITY SCHEMA
// ============================================

export const ActivitySchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  category: EventCategorySchema,
  tags: z.array(z.string()).max(10),
  locationRegion: RegionSchema,
  locationCity: z.string().optional(),
  locationAddress: z.string().optional(),
  estPricePerPerson: z.number().min(0),
  priceIncludes: z.string().optional(),
  shortDescription: z.string().min(1).max(200),
  longDescription: z.string().optional(),
  imageUrl: z.string().url(),
  galleryUrls: z.array(z.string().url()).optional(),
  season: SeasonSchema,
  riskLevel: RiskLevelSchema,
  duration: z.string(),
  groupSizeMin: z.number().min(1),
  groupSizeMax: z.number().min(1),
  physicalIntensity: z.number().min(1).max(5),
  mentalChallenge: z.number().min(1).max(5),
  funFactor: z.number().min(1).max(5),
  teamworkLevel: z.number().min(1).max(5),
  creativityLevel: z.number().min(1).max(5),
  travelTimeMinutes: z.number().optional(),
  preparationNeeded: z.string().optional(),
  equipmentProvided: z.boolean().optional(),
  accessibilityNotes: z.string().optional(),
  bookingUrl: z.string().url().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().optional(),
});

// ============================================
// EVENT CREATION SCHEMA
// ============================================

export const CreateEventSchema = z.object({
  name: z.string()
    .min(3, "Name muss mindestens 3 Zeichen haben")
    .max(100, "Name darf maximal 100 Zeichen haben"),
  description: z.string().max(500).optional(),
  timeWindow: EventTimeWindowSchema,
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

// ============================================
// DATE OPTION SCHEMA
// ============================================

export const DateOptionSchema = z.object({
  date: z.string(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
});

export const AddDateOptionsSchema = z.object({
  dateOptions: z.array(DateOptionSchema).min(1, "Mindestens einen Termin angeben"),
});

export type AddDateOptionsInput = z.infer<typeof AddDateOptionsSchema>;
