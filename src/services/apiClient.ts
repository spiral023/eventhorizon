import type { Room, Activity, Event, User, EventPhase, VoteType, DateResponseType, EventTimeWindow, EventCategory, PrimaryGoal } from "@/types/domain";
import type { CreateEventInput } from "@/schemas";

// ============================================
// AI TYPES
// ============================================

export interface TeamPreferenceSummary {
  categoryDistribution: { category: EventCategory; percentage: number }[];
  preferredGoals: PrimaryGoal[];
  recommendedActivityIds: string[];
  teamVibe: "action" | "relax" | "mixed";
  insights: string[];
}

export interface AiRecommendation {
  activityId: string;
  score: number;
  reason: string;
}

// ============================================
// API TYPES
// ============================================

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResult<T> {
  data: T;
  error?: ApiError;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================
// IN-MEMORY STORE
// ============================================

let favoriteActivityIds: string[] = ["act-1", "act-4"];
let events: Event[] = [];

// Current user mock
const currentUser: User = {
  id: "user-current",
  name: "Max Mustermann",
  email: "max.mustermann@firma.at",
  avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
  department: "Marketing",
  favoriteActivityIds: favoriteActivityIds,
};

// ============================================
// MOCK DATA
// ============================================

const mockRooms: Room[] = [
  {
    id: "room-1",
    name: "Marketing-Team",
    description: "Alle Marketing-Events und Teambuildings",
    memberCount: 12,
    createdAt: "2024-01-15T10:00:00Z",
    createdByUserId: "user-1",
    avatarUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&h=100&fit=crop",
    members: [
      { userId: "user-current", userName: "Max Mustermann", role: "admin", joinedAt: "2024-01-15T10:00:00Z" },
      { userId: "user-2", userName: "Anna Schmidt", role: "member", joinedAt: "2024-01-16T10:00:00Z" },
      { userId: "user-3", userName: "Tom Weber", role: "member", joinedAt: "2024-01-17T10:00:00Z" },
    ],
  },
  {
    id: "room-2",
    name: "Entwickler-Crew",
    description: "Dev-Team Events und Hackathons",
    memberCount: 8,
    createdAt: "2024-02-20T14:30:00Z",
    createdByUserId: "user-2",
    avatarUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=100&h=100&fit=crop",
  },
  {
    id: "room-3",
    name: "Firma XY - Alle",
    description: "Firmenweite Events und Feiern",
    memberCount: 45,
    createdAt: "2023-11-01T09:00:00Z",
    createdByUserId: "user-1",
    avatarUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=100&h=100&fit=crop",
  },
  {
    id: "room-4",
    name: "Sales Champions",
    description: "Vertriebsteam Incentives",
    memberCount: 15,
    createdAt: "2024-03-10T11:00:00Z",
    createdByUserId: "user-3",
    avatarUrl: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=100&h=100&fit=crop",
  },
];

const mockActivities: Activity[] = [
  {
    id: "act-1",
    title: "Kartfahren",
    category: "action",
    tags: ["Adrenalin", "Wettbewerb", "Indoor"],
    locationRegion: "OOE",
    locationCity: "Linz",
    estPricePerPerson: 35,
    priceIncludes: "Leihhelm, Handschuhe, 2 Rennen",
    shortDescription: "Rasantes Kartrennen auf professioneller Indoor-Bahn mit Zeitmessung und Siegerehrung.",
    longDescription: "Erleben Sie puren Nervenkitzel auf unserer 800m langen Indoor-Kartbahn. Inklusive Einweisung, Sicherheitsausrüstung und spannenden Teamwettbewerben.",
    imageUrl: "https://images.unsplash.com/photo-1504945005722-33670dcaf685?w=400&h=300&fit=crop",
    season: "all_year",
    riskLevel: "medium",
    duration: "2-3 Stunden",
    groupSizeMin: 6,
    groupSizeMax: 20,
    physicalIntensity: 3,
    mentalChallenge: 2,
    funFactor: 5,
    teamworkLevel: 3,
    creativityLevel: 1,
    travelTimeMinutes: 30,
    equipmentProvided: true,
    rating: 4.7,
    reviewCount: 234,
  },
  {
    id: "act-2",
    title: "Kletterhalle",
    category: "action",
    tags: ["Sport", "Teamwork", "Indoor"],
    locationRegion: "WIE",
    locationCity: "Wien",
    estPricePerPerson: 25,
    shortDescription: "Gemeinsames Klettern mit professioneller Anleitung für alle Erfahrungsstufen.",
    imageUrl: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=400&h=300&fit=crop",
    season: "all_year",
    riskLevel: "medium",
    duration: "3-4 Stunden",
    groupSizeMin: 4,
    groupSizeMax: 15,
    physicalIntensity: 4,
    mentalChallenge: 3,
    funFactor: 4,
    teamworkLevel: 4,
    creativityLevel: 2,
    equipmentProvided: true,
    rating: 4.5,
    reviewCount: 189,
  },
  {
    id: "act-3",
    title: "Escape Room",
    category: "creative",
    tags: ["Rätsel", "Teamwork", "Indoor"],
    locationRegion: "SBG",
    locationCity: "Salzburg",
    estPricePerPerson: 28,
    shortDescription: "Knifflige Rätsel lösen und gemeinsam den Ausweg finden – perfekt fürs Teambuilding.",
    imageUrl: "https://images.unsplash.com/photo-1533372343425-4a7a1e2f56db?w=400&h=300&fit=crop",
    season: "all_year",
    riskLevel: "low",
    duration: "1-2 Stunden",
    groupSizeMin: 4,
    groupSizeMax: 8,
    physicalIntensity: 1,
    mentalChallenge: 5,
    funFactor: 5,
    teamworkLevel: 5,
    creativityLevel: 4,
    rating: 4.8,
    reviewCount: 312,
  },
  {
    id: "act-4",
    title: "Gemeinsames Kochen",
    category: "food",
    tags: ["Kulinarik", "Kreativ", "Indoor"],
    locationRegion: "WIE",
    locationCity: "Wien",
    estPricePerPerson: 65,
    priceIncludes: "Zutaten, Getränke, Kochschürze",
    shortDescription: "Kochkurs mit Profi-Koch – von der Vorspeise bis zum Dessert gemeinsam zaubern.",
    imageUrl: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop",
    season: "all_year",
    riskLevel: "low",
    duration: "4-5 Stunden",
    groupSizeMin: 8,
    groupSizeMax: 20,
    physicalIntensity: 2,
    mentalChallenge: 2,
    funFactor: 5,
    teamworkLevel: 4,
    creativityLevel: 5,
    rating: 4.9,
    reviewCount: 156,
  },
  {
    id: "act-5",
    title: "Hüttenabend",
    category: "relax",
    tags: ["Gemütlich", "Natur", "Outdoor"],
    locationRegion: "TIR",
    locationCity: "Innsbruck",
    estPricePerPerson: 45,
    shortDescription: "Entspannter Abend auf einer urigen Almhütte mit regionalem Essen und Lagerfeuer.",
    imageUrl: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=400&h=300&fit=crop",
    season: "winter",
    riskLevel: "low",
    duration: "Übernachtung",
    groupSizeMin: 10,
    groupSizeMax: 30,
    physicalIntensity: 1,
    mentalChallenge: 1,
    funFactor: 4,
    teamworkLevel: 3,
    creativityLevel: 2,
    travelTimeMinutes: 60,
    rating: 4.6,
    reviewCount: 98,
  },
  {
    id: "act-6",
    title: "Rafting Tour",
    category: "outdoor",
    tags: ["Abenteuer", "Wasser", "Natur"],
    locationRegion: "SBG",
    locationCity: "Werfen",
    estPricePerPerson: 55,
    shortDescription: "Wildwasser-Rafting auf der Salzach – Adrenalin pur im Team!",
    imageUrl: "https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=400&h=300&fit=crop",
    season: "summer",
    riskLevel: "high",
    duration: "4-5 Stunden",
    groupSizeMin: 6,
    groupSizeMax: 24,
    physicalIntensity: 4,
    mentalChallenge: 2,
    funFactor: 5,
    teamworkLevel: 5,
    creativityLevel: 1,
    travelTimeMinutes: 45,
    equipmentProvided: true,
    rating: 4.8,
    reviewCount: 267,
  },
  {
    id: "act-7",
    title: "Weinverkostung",
    category: "food",
    tags: ["Kulinarik", "Genuss", "Bildung"],
    locationRegion: "STMK",
    locationCity: "Leibnitz",
    estPricePerPerson: 40,
    shortDescription: "Edle Tropfen probieren in einem traditionellen Weingut mit Kellerführung.",
    imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop",
    season: "autumn",
    riskLevel: "low",
    duration: "3-4 Stunden",
    groupSizeMin: 8,
    groupSizeMax: 25,
    physicalIntensity: 1,
    mentalChallenge: 2,
    funFactor: 4,
    teamworkLevel: 2,
    creativityLevel: 2,
    rating: 4.7,
    reviewCount: 145,
  },
  {
    id: "act-8",
    title: "Lasertag",
    category: "action",
    tags: ["Spaß", "Wettbewerb", "Indoor"],
    locationRegion: "NOE",
    locationCity: "St. Pölten",
    estPricePerPerson: 22,
    shortDescription: "Actionreiches Lasertag-Match in futuristischer Arena – Team gegen Team!",
    imageUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=300&fit=crop",
    season: "all_year",
    riskLevel: "low",
    duration: "2-3 Stunden",
    groupSizeMin: 8,
    groupSizeMax: 30,
    physicalIntensity: 3,
    mentalChallenge: 2,
    funFactor: 5,
    teamworkLevel: 4,
    creativityLevel: 2,
    equipmentProvided: true,
    rating: 4.4,
    reviewCount: 203,
  },
];

// Initial mock events
events = [
  {
    id: "event-1",
    roomId: "room-1",
    name: "Sommer-Teamevent 2024",
    description: "Unser jährliches Sommer-Teamevent mit Action und Spaß!",
    phase: "voting",
    timeWindow: { type: "month", value: 7 },
    votingDeadline: "2024-12-20T23:59:59Z",
    budgetType: "per_person",
    budgetAmount: 50,
    participantCountEstimate: 12,
    locationRegion: "OOE",
    proposedActivityIds: ["act-1", "act-3", "act-6"],
    activityVotes: [
      {
        activityId: "act-1",
        votes: [
          { userId: "user-current", userName: "Max Mustermann", vote: "for", votedAt: "2024-12-01T10:00:00Z" },
          { userId: "user-2", userName: "Anna Schmidt", vote: "for", votedAt: "2024-12-01T11:00:00Z" },
        ],
      },
      {
        activityId: "act-3",
        votes: [
          { userId: "user-current", userName: "Max Mustermann", vote: "against", votedAt: "2024-12-01T10:00:00Z" },
        ],
      },
    ],
    dateOptions: [],
    participants: [
      { userId: "user-current", userName: "Max Mustermann", isOrganizer: true, hasVoted: true },
      { userId: "user-2", userName: "Anna Schmidt", isOrganizer: false, hasVoted: true },
      { userId: "user-3", userName: "Tom Weber", isOrganizer: false, hasVoted: false },
    ],
    createdAt: "2024-11-01T09:00:00Z",
    createdByUserId: "user-current",
  },
  {
    id: "event-2",
    roomId: "room-1",
    name: "Weihnachtsfeier",
    phase: "scheduling",
    timeWindow: { type: "month", value: 12 },
    votingDeadline: "2024-12-01T23:59:59Z",
    budgetType: "total",
    budgetAmount: 800,
    participantCountEstimate: 15,
    locationRegion: "WIE",
    proposedActivityIds: ["act-4", "act-7"],
    activityVotes: [],
    chosenActivityId: "act-4",
    dateOptions: [
      {
        id: "date-1",
        date: "2024-12-20",
        startTime: "18:00",
        endTime: "22:00",
        responses: [
          { userId: "user-current", userName: "Max Mustermann", response: "yes" },
          { userId: "user-2", userName: "Anna Schmidt", response: "yes", contribution: 20 },
        ],
      },
      {
        id: "date-2",
        date: "2024-12-21",
        startTime: "17:00",
        responses: [
          { userId: "user-current", userName: "Max Mustermann", response: "maybe" },
        ],
      },
    ],
    participants: [
      { userId: "user-current", userName: "Max Mustermann", isOrganizer: true, hasVoted: true, dateResponse: "yes" },
      { userId: "user-2", userName: "Anna Schmidt", isOrganizer: false, hasVoted: true, dateResponse: "yes" },
    ],
    createdAt: "2024-10-15T14:00:00Z",
    createdByUserId: "user-current",
  },
];

// ============================================
// API FUNCTIONS
// ============================================

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Rooms
export async function getRooms(): Promise<ApiResult<Room[]>> {
  await delay(300);
  return { data: mockRooms };
}

export async function getRoomById(id: string): Promise<ApiResult<Room | null>> {
  await delay(200);
  const room = mockRooms.find((r) => r.id === id) || null;
  return { data: room };
}

// Activities
export async function getActivities(): Promise<ApiResult<Activity[]>> {
  await delay(400);
  return { data: mockActivities };
}

export async function getActivityById(id: string): Promise<ApiResult<Activity | null>> {
  await delay(200);
  const activity = mockActivities.find((a) => a.id === id) || null;
  return { data: activity };
}

// Favorites
export async function getFavoriteActivityIds(): Promise<ApiResult<string[]>> {
  await delay(100);
  return { data: favoriteActivityIds };
}

export async function toggleFavorite(activityId: string): Promise<ApiResult<boolean>> {
  await delay(150);
  const index = favoriteActivityIds.indexOf(activityId);
  if (index > -1) {
    favoriteActivityIds.splice(index, 1);
    return { data: false };
  } else {
    favoriteActivityIds.push(activityId);
    return { data: true };
  }
}

export async function isFavorite(activityId: string): Promise<ApiResult<boolean>> {
  await delay(50);
  return { data: favoriteActivityIds.includes(activityId) };
}

// Events
export async function getEventsByRoom(roomId: string): Promise<ApiResult<Event[]>> {
  await delay(300);
  const roomEvents = events.filter((e) => e.roomId === roomId);
  return { data: roomEvents };
}

export async function getEventById(eventId: string): Promise<ApiResult<Event | null>> {
  await delay(200);
  const event = events.find((e) => e.id === eventId) || null;
  return { data: event };
}

export async function createEvent(roomId: string, input: CreateEventInput & { timeWindow: EventTimeWindow }): Promise<ApiResult<Event>> {
  await delay(400);
  const newEvent: Event = {
    id: `event-${Date.now()}`,
    roomId,
    name: input.name,
    description: input.description,
    phase: "proposal",
    timeWindow: input.timeWindow,
    votingDeadline: input.votingDeadline,
    budgetType: input.budgetType,
    budgetAmount: input.budgetAmount,
    participantCountEstimate: input.participantCountEstimate,
    locationRegion: input.locationRegion,
    proposedActivityIds: input.proposedActivityIds,
    activityVotes: input.proposedActivityIds.map((id) => ({ activityId: id, votes: [] })),
    dateOptions: [],
    participants: [
      { userId: currentUser.id, userName: currentUser.name, isOrganizer: true, hasVoted: false },
    ],
    createdAt: new Date().toISOString(),
    createdByUserId: currentUser.id,
  };
  events.push(newEvent);
  return { data: newEvent };
}

export async function updateEventPhase(eventId: string, newPhase: EventPhase): Promise<ApiResult<Event | null>> {
  await delay(200);
  const event = events.find((e) => e.id === eventId);
  if (event) {
    event.phase = newPhase;
    event.updatedAt = new Date().toISOString();
    return { data: event };
  }
  return { data: null };
}

export async function voteOnActivity(
  eventId: string,
  activityId: string,
  vote: VoteType
): Promise<ApiResult<Event | null>> {
  await delay(200);
  const event = events.find((e) => e.id === eventId);
  if (event) {
    let activityVote = event.activityVotes.find((av) => av.activityId === activityId);
    if (!activityVote) {
      activityVote = { activityId, votes: [] };
      event.activityVotes.push(activityVote);
    }
    // Remove existing vote from current user
    activityVote.votes = activityVote.votes.filter((v) => v.userId !== currentUser.id);
    // Add new vote
    activityVote.votes.push({
      userId: currentUser.id,
      userName: currentUser.name,
      vote,
      votedAt: new Date().toISOString(),
    });
    // Update participant status
    const participant = event.participants.find((p) => p.userId === currentUser.id);
    if (participant) {
      participant.hasVoted = true;
    }
    return { data: event };
  }
  return { data: null };
}

export async function respondToDateOption(
  eventId: string,
  dateOptionId: string,
  response: DateResponseType,
  contribution?: number
): Promise<ApiResult<Event | null>> {
  await delay(200);
  const event = events.find((e) => e.id === eventId);
  if (event) {
    const dateOption = event.dateOptions.find((d) => d.id === dateOptionId);
    if (dateOption) {
      // Remove existing response
      dateOption.responses = dateOption.responses.filter((r) => r.userId !== currentUser.id);
      // Add new response
      dateOption.responses.push({
        userId: currentUser.id,
        userName: currentUser.name,
        response,
        contribution,
      });
      // Update participant
      const participant = event.participants.find((p) => p.userId === currentUser.id);
      if (participant) {
        participant.dateResponse = response;
      }
    }
    return { data: event };
  }
  return { data: null };
}

export async function selectWinningActivity(eventId: string, activityId: string): Promise<ApiResult<Event | null>> {
  await delay(200);
  const event = events.find((e) => e.id === eventId);
  if (event) {
    event.chosenActivityId = activityId;
    event.phase = "scheduling";
    return { data: event };
  }
  return { data: null };
}

export async function finalizeDateOption(eventId: string, dateOptionId: string): Promise<ApiResult<Event | null>> {
  await delay(200);
  const event = events.find((e) => e.id === eventId);
  if (event) {
    event.finalDateOptionId = dateOptionId;
    event.phase = "info";
    return { data: event };
  }
  return { data: null };
}

// ============================================
// AUTH FUNCTIONS
// ============================================

let isLoggedIn = true;

export async function getCurrentUser(): Promise<ApiResult<User | null>> {
  await delay(100);
  return { data: isLoggedIn ? currentUser : null };
}

export async function mockLogin(email: string, password: string): Promise<ApiResult<User>> {
  await delay(500);
  isLoggedIn = true;
  return { data: currentUser };
}

export async function mockLogout(): Promise<ApiResult<void>> {
  await delay(200);
  isLoggedIn = false;
  return { data: undefined };
}

export function isAuthenticated(): boolean {
  return isLoggedIn;
}

// ============================================
// AI / RECOMMENDATION FUNCTIONS
// ============================================

export async function getTeamRecommendations(roomId: string): Promise<ApiResult<TeamPreferenceSummary>> {
  await delay(600);
  const summary: TeamPreferenceSummary = {
    categoryDistribution: [
      { category: "action", percentage: 35 },
      { category: "food", percentage: 25 },
      { category: "outdoor", percentage: 20 },
      { category: "relax", percentage: 15 },
      { category: "creative", percentage: 5 },
    ],
    preferredGoals: ["teambuilding", "fun"],
    recommendedActivityIds: ["act-1", "act-3", "act-6"],
    teamVibe: "action",
    insights: [
      "Euer Team bevorzugt aktive Erlebnisse mit Wettbewerbscharakter.",
      "Kulinarische Events kommen als gemeinsamer Abschluss gut an.",
      "Outdoor-Aktivitäten sind im Sommer besonders beliebt.",
    ],
  };
  return { data: summary };
}

export async function getActivitySuggestionsForEvent(eventId: string): Promise<ApiResult<AiRecommendation[]>> {
  await delay(500);
  const recommendations: AiRecommendation[] = [
    { activityId: "act-1", score: 0.95, reason: "Passt perfekt zum aktiven Teamprofil und Budget" },
    { activityId: "act-3", score: 0.88, reason: "Fördert Teamwork und ist für alle Fitnesslevel geeignet" },
    { activityId: "act-6", score: 0.82, reason: "Beliebt im Sommer, hoher Spaßfaktor" },
  ];
  return { data: recommendations };
}

// ============================================
// EMAIL TRIGGER FUNCTIONS
// ============================================

export async function sendEventInvites(eventId: string): Promise<ApiResult<{ sent: number }>> {
  await delay(800);
  const event = events.find((e) => e.id === eventId);
  const count = event?.participants.length || 0;
  return { data: { sent: count } };
}

export async function sendVotingReminder(eventId: string): Promise<ApiResult<{ sent: number }>> {
  await delay(600);
  const event = events.find((e) => e.id === eventId);
  const notVoted = event?.participants.filter((p) => !p.hasVoted).length || 0;
  return { data: { sent: notVoted } };
}
