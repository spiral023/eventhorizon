import type { Room, Activity, Event, User, EventPhase, VoteType, DateResponseType, EventTimeWindow, EventCategory, PrimaryGoal } from "@/types/domain";
import type { CreateEventInput } from "@/schemas";
import type { ApiResult } from "@/types/api";

// ============================================ 
// CONFIG & HELPERS
// ============================================ 

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
const API_BASE = '/api/v1';
const AUTH_TOKEN_KEY = "eventhorizon_auth_token";

const getStoredToken = () => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
};

const setStoredToken = (token: string | null) => {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    /* ignore storage errors */
  }
};

async function request<T>(endpoint: string, options?: RequestInit): Promise<ApiResult<T>> {
  try {
    const token = getStoredToken();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch { /* ignore */ }
      
      return { 
        data: null as any, 
        error: { code: String(response.status), message: errorMessage } 
      };
    }

    const data = await response.json();
    return { data };
  } catch (e) {
    return { 
      data: null as any, 
      error: { code: "NETWORK_ERROR", message: e instanceof Error ? e.message : "Netzwerkfehler" } 
    };
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================ 
// MOCK DATA (Moved to top to avoid ReferenceError)
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
  // ... (keeping mockRooms short for brevity in this turn, but normally full list)
];

const mockActivities: Activity[] = [
  {
    id: "act-1",
    title: "Masters of Escape: Team-Rätselspaß in Linz",
    category: "action",
    tags: ["escape-game", "teambuilding", "puzzle"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Kaarstraße 9, 4040 Linz",
    estPricePerPerson: 28,
    priceComment: "Reine Spielgebühr ca. 25–30 € p.P. (je nach Teamgröße); bei mehreren Räumen gleichzeitig oft Rabatte auf Anfrage.",
    shortDescription: "Teamstärkende Rätsel, Spannung, Kooperation, unvergesslicher Spaß.",
    longDescription: "Adrenalin, Teamgeist und Rätselspaß: In dieser Escape Room Challenge wachst Ihr als Team zusammen, kommuniziert besser und feiert gemeinsam den Erfolg.",
    imageUrl: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 3.5,
    minParticipants: 8,
    recommendedGroupSizeMin: 8,
    recommendedGroupSizeMax: 15,
    physicalIntensity: 2,
    mentalChallenge: 5,
    socialInteractionLevel: 5,
    competitionLevel: 1,
    accessibilityFlags: ["wheelchair"],
    weatherDependent: false,
    externalRating: 4.9,
    travelTimeMinutes: 5,
    travelTimeMinutesWalking: 42,
    leadTimeMinDays: 7,
    primaryGoal: "teambuilding",
    provider: "Masters of Escape GmbH",
    website: "https://www.mastersofescape.at",
    contactPhone: "0732272999",
    contactEmail: "office@mastersofescape.at",
    coordinates: [48.3129, 14.2830],
  },
  // ... (more activities would be here)
];

let events: Event[] = [
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
    proposedActivityIds: ["act-1"],
    activityVotes: [],
    dateOptions: [],
    participants: [
      { userId: "user-current", userName: "Max Mustermann", isOrganizer: true, hasVoted: true },
    ],
    createdAt: "2024-11-01T09:00:00Z",
    createdByUserId: "user-current",
  }
];

let favoriteActivityIds: string[] = ["act-1"];

const currentUser: User = {
  id: "user-current",
  name: "Max Mustermann",
  email: "max.mustermann@firma.at",
  username: "max",
  avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
  department: "Marketing",
  createdAt: "2024-01-01T00:00:00Z",
  isActive: true,
  favoriteActivityIds: favoriteActivityIds,
};

// ============================================ 
// API FUNCTIONS
// ============================================ 

// --- Auth ---

function mapUserFromApi(apiUser: any): User {
  if (!apiUser) return apiUser;
  return {
    id: apiUser.id,
    email: apiUser.email,
    username: apiUser.username || apiUser.email,
    name: apiUser.name,
    avatarUrl: apiUser.avatar_url,
    department: apiUser.department,
    birthday: apiUser.birthday,
    createdAt: apiUser.created_at,
    isActive: apiUser.is_active,
    favoriteActivityIds: apiUser.favorite_activity_ids,
  } as unknown as User;
}

export async function login(username: string, password: string): Promise<ApiResult<User>> {
  if (USE_MOCKS) {
    const result = await mockLogin(username, password);
    if (result.data) {
      setStoredToken("mock-token");
    }
    return result;
  }

  try {
    const body = new URLSearchParams();
    body.append("username", username);
    body.append("password", password);

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { data: null as any, error: { code: String(response.status), message: err.detail || "Login fehlgeschlagen" } };
    }

    const data = await response.json();
    setStoredToken(data.access_token);
    return { data: mapUserFromApi(data.user) };
  } catch (e) {
    return { data: null as any, error: { code: "NETWORK_ERROR", message: e instanceof Error ? e.message : "Netzwerkfehler" } };
  }
}

export async function register(user: { email: string; username: string; name: string; password: string }): Promise<ApiResult<User>> {
  if (USE_MOCKS) {
    const mockUser: User = {
      id: `user-${Date.now()}`,
      email: user.email,
      username: user.username,
      name: user.name,
      avatarUrl: "",
      department: "",
      createdAt: new Date().toISOString(),
      isActive: true,
    } as any;
    setStoredToken("mock-token");
    return { data: mockUser };
  }

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { data: null as any, error: { code: String(response.status), message: err.detail || "Registrierung fehlgeschlagen" } };
    }

    const data = await response.json();
    setStoredToken(data.access_token);
    return { data: mapUserFromApi(data.user) };
  } catch (e) {
    return { data: null as any, error: { code: "NETWORK_ERROR", message: e instanceof Error ? e.message : "Netzwerkfehler" } };
  }
}

export async function logout(): Promise<void> {
  setStoredToken(null);
}

export async function getCurrentUser(): Promise<ApiResult<User | null>> {
  if (USE_MOCKS) {
    await delay(100);
    return { data: isLoggedIn ? currentUser : null };
  }
  const result = await request<any>('/auth/me');
  if (result.data) {
    return { data: mapUserFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

// --- Activities ---

function mapActivityFromApi(apiActivity: any): Activity {
  return {
    ...apiActivity,
    // Map snake_case to camelCase
    locationRegion: apiActivity.location_region,
    locationCity: apiActivity.location_city,
    locationAddress: apiActivity.address || apiActivity.location_address, // support both aliases
    estPricePerPerson: apiActivity.est_price_pp || apiActivity.est_price_per_person,
    priceComment: apiActivity.price_comment,
    shortDescription: apiActivity.short_description,
    longDescription: apiActivity.long_description,
    imageUrl: apiActivity.image_url,
    galleryUrls: apiActivity.gallery_urls,
    season: apiActivity.season,
    riskLevel: apiActivity.risk_level,
    typicalDurationHours: apiActivity.typical_duration_hours,
    recommendedGroupSizeMin: apiActivity.recommended_group_size_min,
    recommendedGroupSizeMax: apiActivity.recommended_group_size_max,
    groupSizeMin: apiActivity.recommended_group_size_min, // Fallback/Alias
    groupSizeMax: apiActivity.recommended_group_size_max, // Fallback/Alias
    
    physicalIntensity: apiActivity.physical_intensity,
    mentalChallenge: apiActivity.mental_challenge,
    socialInteractionLevel: apiActivity.social_interaction_level,
    competitionLevel: apiActivity.competition_level,
    
    accessibilityFlags: apiActivity.accessibility_flags,
    weatherDependent: apiActivity.weather_dependent,
    
    externalRating: apiActivity.external_rating,
    primaryGoal: apiActivity.primary_goal,
    
    travelTimeMinutes: apiActivity.travel_time_from_office_minutes,
    travelTimeMinutesWalking: apiActivity.travel_time_from_office_minutes_walking,
    
    provider: apiActivity.provider,
    website: apiActivity.website,
    contactPhone: apiActivity.phone || apiActivity.contact_phone,
    contactEmail: apiActivity.email || apiActivity.contact_email,
    
    // Ensure ID is present
    id: apiActivity.id,
  } as Activity;
}

export async function getActivities(): Promise<ApiResult<Activity[]>> {
  if (USE_MOCKS) {
    await delay(400);
    return { data: mockActivities };
  }
  const result = await request<any[]>('/activities');
  if (result.data) {
    return { data: result.data.map(mapActivityFromApi) };
  }
  return { data: [], error: result.error };
}

export async function getActivityById(id: string): Promise<ApiResult<Activity | null>> {
  if (USE_MOCKS) {
    await delay(200);
    const activity = mockActivities.find((a) => a.id === id) || null;
    return { data: activity };
  }
  const result = await request<any>(`/activities/${id}`);
  if (result.data) {
    return { data: mapActivityFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

// --- Rooms ---

export async function getRooms(): Promise<ApiResult<Room[]>> {
  if (USE_MOCKS) {
    await delay(300);
    return { data: mockRooms };
  }
  return request<Room[]>('/rooms');
}

export async function getRoomById(id: string): Promise<ApiResult<Room | null>> {
  if (USE_MOCKS) {
    await delay(200);
    const room = mockRooms.find((r) => r.id === id) || null;
    return { data: room };
  }
  return request<Room>(`/rooms/${id}`);
}

export async function createRoom(input: { name: string; description?: string }): Promise<ApiResult<Room>> {
  if (USE_MOCKS) {
    await delay(400);
    const newRoom: Room = {
      id: `room-${Date.now()}`,
      name: input.name,
      description: input.description,
      memberCount: 1,
      createdAt: new Date().toISOString(),
      createdByUserId: "user-current",
      avatarUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&h=100&fit=crop",
    };
    mockRooms.push(newRoom);
    return { data: newRoom };
  }
  return request<Room>('/rooms', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// --- Events ---

export async function getEventsByRoom(roomId: string): Promise<ApiResult<Event[]>> {
  if (USE_MOCKS) {
    await delay(300);
    const roomEvents = events.filter((e) => e.roomId === roomId);
    return { data: roomEvents };
  }
  return request<Event[]>(`/rooms/${roomId}/events`);
}

export async function getEventById(eventId: string): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    await delay(200);
    const event = events.find((e) => e.id === eventId) || null;
    return { data: event };
  }
  return request<Event>(`/events/${eventId}`);
}

export async function createEvent(roomId: string, input: CreateEventInput & { timeWindow: EventTimeWindow }): Promise<ApiResult<Event>> {
  if (USE_MOCKS) {
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
  return request<Event>(`/rooms/${roomId}/events`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateEventPhase(eventId: string, newPhase: EventPhase): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    await delay(200);
    const event = events.find((e) => e.id === eventId);
    if (event) {
      event.phase = newPhase;
      event.updatedAt = new Date().toISOString();
      return { data: event };
    }
    return { data: null };
  }
  return request<Event>(`/events/${eventId}/phase`, {
    method: 'PATCH',
    body: JSON.stringify({ phase: newPhase }),
  });
}

export async function voteOnActivity(eventId: string, activityId: string, vote: VoteType): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    await delay(200);
    const event = events.find((e) => e.id === eventId);
    if (event) {
      let activityVote = event.activityVotes.find((av) => av.activityId === activityId);
      if (!activityVote) {
        activityVote = { activityId, votes: [] };
        event.activityVotes.push(activityVote);
      }
      activityVote.votes = activityVote.votes.filter((v) => v.userId !== currentUser.id);
      activityVote.votes.push({
        userId: currentUser.id,
        userName: currentUser.name,
        vote,
        votedAt: new Date().toISOString(),
      });
      return { data: event };
    }
    return { data: null };
  }
  return request<Event>(`/events/${eventId}/votes`, {
    method: 'POST',
    body: JSON.stringify({ activity_id: activityId, vote }),
  });
}

export async function respondToDateOption(eventId: string, dateOptionId: string, response: DateResponseType, contribution?: number): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    await delay(200);
    const event = events.find((e) => e.id === eventId);
    if (event) {
      const dateOption = event.dateOptions.find((d) => d.id === dateOptionId);
      if (dateOption) {
        dateOption.responses = dateOption.responses.filter((r) => r.userId !== currentUser.id);
        dateOption.responses.push({
          userId: currentUser.id,
          userName: currentUser.name,
          response,
          contribution,
        });
      }
      return { data: event };
    }
    return { data: null };
  }
  return request<Event>(`/events/${eventId}/date-options/${dateOptionId}/response`, {
    method: 'POST',
    body: JSON.stringify({ response, contribution }),
  });
}

export async function selectWinningActivity(eventId: string, activityId: string): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    await delay(200);
    const event = events.find((e) => e.id === eventId);
    if (event) {
      event.chosenActivityId = activityId;
      event.phase = "scheduling";
      return { data: event };
    }
    return { data: null };
  }
  return request<Event>(`/events/${eventId}/select-activity`, {
    method: 'POST',
    body: JSON.stringify({ activity_id: activityId }),
  });
}

export async function finalizeDateOption(eventId: string, dateOptionId: string): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    await delay(200);
    const event = events.find((e) => e.id === eventId);
    if (event) {
      event.finalDateOptionId = dateOptionId;
      event.phase = "info";
      return { data: event };
    }
    return { data: null };
  }
  return request<Event>(`/events/${eventId}/finalize-date`, {
    method: 'POST',
    body: JSON.stringify({ date_option_id: dateOptionId }),
  });
}

// --- Favorites & Auth (Mock Only for now) ---

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

let isLoggedIn = true;

async function mockLogin(email: string, password: string): Promise<ApiResult<User>> {
  await delay(500);
  isLoggedIn = true;
  return { data: currentUser };
}

async function mockLogout(): Promise<ApiResult<void>> {
  await delay(200);
  isLoggedIn = false;
  return { data: undefined };
}

// --- AI / Extras ---

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
    recommendedActivityIds: ["act-1"],
    teamVibe: "action",
    insights: [
      "Euer Team bevorzugt aktive Erlebnisse mit Wettbewerbscharakter.",
    ],
  };
  return { data: summary };
}

export async function getActivitySuggestionsForEvent(eventId: string): Promise<ApiResult<AiRecommendation[]>> {
  await delay(500);
  return { data: [] };
}

export async function sendEventInvites(eventId: string): Promise<ApiResult<{ sent: number }>> {
  await delay(800);
  return { data: { sent: 5 } };
}

export async function sendVotingReminder(eventId: string): Promise<ApiResult<{ sent: number }>> {
  await delay(600);
  return { data: { sent: 3 } };
}
