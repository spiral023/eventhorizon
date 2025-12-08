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
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: headers,
      ...options,
    });
    
    // Attempt to parse JSON only if content type is application/json
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      // If not JSON, treat raw text as data or null if empty
      const rawText = await response.text();
      data = rawText || null;
      if (data === "null") data = null; // Handle explicit "null" string response
    }
    
    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;
      if (data && typeof data === 'object' && 'detail' in data) {
        errorMessage = (data as any).detail;
      } else if (typeof data === 'string' && data.length > 0) {
        errorMessage = data;
      }

      return { 
        data: null as any, 
        error: { code: String(response.status), message: errorMessage } 
      };
    }
    
    // Return data, ensuring it's not the string "null"
    if (data === "null") data = null;
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
    id: apiActivity.id,
    createdAt: apiActivity.created_at,

    locationRegion: apiActivity.location_region,
    locationCity: apiActivity.location_city,
    locationAddress: apiActivity.address || apiActivity.location_address, // support both aliases
    coordinates: apiActivity.coordinates,

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
    minParticipants: apiActivity.recommended_group_size_min, // Fallback

    physicalIntensity: apiActivity.physical_intensity,
    mentalChallenge: apiActivity.mental_challenge,
    socialInteractionLevel: apiActivity.social_interaction_level,
    competitionLevel: apiActivity.competition_level,

    accessibilityFlags: apiActivity.accessibility_flags || [],
    weatherDependent: apiActivity.weather_dependent,

    externalRating: apiActivity.external_rating,
    primaryGoal: apiActivity.primary_goal,

    travelTimeMinutes: apiActivity.travel_time_from_office_minutes,
    travelTimeMinutesWalking: apiActivity.travel_time_from_office_minutes_walking,

    provider: apiActivity.provider,
    website: apiActivity.website,
    contactPhone: apiActivity.phone || apiActivity.contact_phone,
    contactEmail: apiActivity.email || apiActivity.contact_email,
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

function mapEventFromApi(apiEvent: any): Event {
  if (!apiEvent) return apiEvent;

  // Transform activity_votes from backend format to frontend format
  // Backend: Array of { event_id, activity_id, user_id, vote, voted_at }
  // Frontend: Array of { activityId, votes: [{userId, userName, vote, votedAt}] }
  let activityVotes: any[] = [];
  const rawVotes = apiEvent.activity_votes || apiEvent.activityVotes || [];

  // Check if already in frontend format (has "votes" property)
  if (rawVotes.length > 0 && rawVotes[0].votes !== undefined) {
    // Already in frontend format
    activityVotes = rawVotes.map((av: any) => ({
      ...av,
      activityId: av.activity_id || av.activityId,
      votes: (av.votes || []).map((v: any) => ({
        ...v,
        userId: v.user_id || v.userId,
        userName: v.user_name || v.userName,
        votedAt: v.voted_at || v.votedAt,
      })),
    }));
  } else {
    // Backend format - group votes by activity_id
    const votesByActivity = new Map<string, any[]>();

    // Get all proposed activities
    const proposedIds = apiEvent.proposed_activity_ids || apiEvent.proposedActivityIds || [];

    // Initialize with empty votes for all proposed activities
    proposedIds.forEach((activityId: string) => {
      votesByActivity.set(activityId, []);
    });

    // Group votes by activity
    rawVotes.forEach((vote: any) => {
      const activityId = vote.activity_id || vote.activityId;
      if (!votesByActivity.has(activityId)) {
        votesByActivity.set(activityId, []);
      }
      votesByActivity.get(activityId)!.push({
        userId: vote.user_id || vote.userId,
        userName: vote.user_name || vote.userName,
        vote: vote.vote,
        votedAt: vote.voted_at || vote.votedAt,
      });
    });

    // Convert map to array
    activityVotes = Array.from(votesByActivity.entries()).map(([activityId, votes]) => ({
      activityId,
      votes,
    }));
  }

  return {
    ...apiEvent,
    // Map snake_case to camelCase
    roomId: apiEvent.room_id || apiEvent.roomId,
    timeWindow: apiEvent.time_window || apiEvent.timeWindow,
    votingDeadline: apiEvent.voting_deadline || apiEvent.votingDeadline,
    budgetType: apiEvent.budget_type || apiEvent.budgetType,
    budgetAmount: apiEvent.budget_amount || apiEvent.budgetAmount,
    participantCountEstimate: apiEvent.participant_count_estimate || apiEvent.participantCountEstimate,
    locationRegion: apiEvent.location_region || apiEvent.locationRegion,

    proposedActivityIds: apiEvent.proposed_activity_ids || apiEvent.proposedActivityIds,
    activityVotes,
    chosenActivityId: apiEvent.chosen_activity_id || apiEvent.chosenActivityId,
    
    dateOptions: (apiEvent.date_options || apiEvent.dateOptions || []).map((do_: any) => ({
      ...do_,
      startTime: do_.start_time || do_.startTime,
      endTime: do_.end_time || do_.endTime,
      responses: (do_.responses || []).map((r: any) => ({
        ...r,
        userId: r.user_id || r.userId,
        userName: r.user_name || r.userName,
      })),
    })),
    finalDateOptionId: apiEvent.final_date_option_id || apiEvent.finalDateOptionId,
    
    participants: (apiEvent.participants || []).map((p: any) => ({
      ...p,
      userId: p.user_id || p.userId,
      userName: p.user_name || p.userName,
      avatarUrl: p.avatar_url || p.avatarUrl,
      isOrganizer: p.is_organizer !== undefined ? p.is_organizer : p.isOrganizer,
      hasVoted: p.has_voted !== undefined ? p.has_voted : p.hasVoted,
      dateResponse: p.date_response || p.dateResponse,
    })),
    
    createdAt: apiEvent.created_at || apiEvent.createdAt,
    createdByUserId: apiEvent.created_by_user_id || apiEvent.createdByUserId,
    updatedAt: apiEvent.updated_at || apiEvent.updatedAt,
    
    // Ensure ID is present
    id: apiEvent.id,
  } as Event;
}

export async function getEventsByRoom(roomId: string): Promise<ApiResult<Event[]>> {
  if (USE_MOCKS) {
    await delay(300);
    const roomEvents = events.filter((e) => e.roomId === roomId);
    return { data: roomEvents };
  }
  const result = await request<any[]>(`/rooms/${roomId}/events`);
  if (result.data) {
    return { data: result.data.map(mapEventFromApi) };
  }
  return { data: [], error: result.error };
}

export async function getEventById(eventId: string): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    await delay(200);
    const event = events.find((e) => e.id === eventId) || null;
    return { data: event };
  }
  const result = await request<any>(`/events/${eventId}`);
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null, error: result.error };
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

  // Convert camelCase to snake_case for backend API
  const apiPayload = {
    name: input.name,
    description: input.description,
    time_window: input.timeWindow,
    voting_deadline: input.votingDeadline,
    budget_type: input.budgetType,
    budget_amount: input.budgetAmount,
    participant_count_estimate: input.participantCountEstimate,
    location_region: input.locationRegion,
    proposed_activity_ids: input.proposedActivityIds,
  };

  console.log(`Making API call to create event for room ${roomId}`, apiPayload);
  const result = await request<any>(`/rooms/${roomId}/events`, {
    method: 'POST',
    body: JSON.stringify(apiPayload),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null as any, error: result.error };
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
  const result = await request<any>(`/events/${eventId}/phase`, {
    method: 'PATCH',
    body: JSON.stringify({ phase: newPhase }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null, error: result.error };
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
  const result = await request<any>(`/events/${eventId}/votes`, {
    method: 'POST',
    body: JSON.stringify({ activity_id: activityId, vote }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null, error: result.error };
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
  const result = await request<any>(`/events/${eventId}/date-options/${dateOptionId}/response`, {
    method: 'POST',
    body: JSON.stringify({ response, contribution }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null, error: result.error };
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
  const result = await request<any>(`/events/${eventId}/select-activity`, {
    method: 'POST',
    body: JSON.stringify({ activity_id: activityId }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null, error: result.error };
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
  const result = await request<any>(`/events/${eventId}/finalize-date`, {
    method: 'POST',
    body: JSON.stringify({ date_option_id: dateOptionId }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null, error: result.error };
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
