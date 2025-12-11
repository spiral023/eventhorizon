import type { Room, Activity, Event, User, EventPhase, VoteType, DateResponseType, EventTimeWindow, EventCategory, PrimaryGoal, UserStats, EventComment, ActivityComment } from "@/types/domain";
import type { CreateEventInput } from "@/schemas";
import type { ApiResult } from "@/types/api";

export interface AvatarUploadInfo {
  uploadUrl: string;
  publicUrl: string;
}

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

// Generate random invite code in format XXX-XXX-XXX (excluding O, 0, I, 1)
const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes O, 0, I, 1
  const generatePart = () => Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${generatePart()}-${generatePart()}-${generatePart()}`;
};

// ============================================ 
// MOCK DATA (Moved to top to avoid ReferenceError)
// ============================================ 

const mockRooms: Room[] = [
  {
    id: "room-1",
    name: "Marketing-Team",
    description: "Alle Marketing-Events und Teambuildings",
    inviteCode: "A2B-3C4-D5E",
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
    name: "Dev-Team",
    description: "Entwickler-Team Events",
    inviteCode: "F6G-7H8-J9K",
    memberCount: 8,
    createdAt: "2024-02-01T10:00:00Z",
    createdByUserId: "user-2",
    avatarUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=100&h=100&fit=crop",
    members: [
      { userId: "046b1c94-83c7-45bb-a6b9-9d02b3b6a8a1", userName: "Max Mustermann", role: "member", joinedAt: "2024-02-01T10:00:00Z" },
    ],
  },
  {
    id: "room-3",
    name: "Sales-Team",
    description: "Vertriebsteam Aktivitäten",
    inviteCode: "L2M-3N4-P5Q",
    memberCount: 15,
    createdAt: "2024-03-01T10:00:00Z",
    createdByUserId: "user-3",
    avatarUrl: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=100&h=100&fit=crop",
    members: [
      { userId: "046b1c94-83c7-45bb-a6b9-9d02b3b6a8a1", userName: "Max Mustermann", role: "member", joinedAt: "2024-03-01T10:00:00Z" },
    ],
  },
  {
    id: "room-4",
    name: "Mein persönlicher Raum",
    description: "Hier kann ich alles ausprobieren",
    inviteCode: "R6S-7T8-U9V",
    memberCount: 1,
    createdAt: "2024-04-01T10:00:00Z",
    createdByUserId: "046b1c94-83c7-45bb-a6b9-9d02b3b6a8a1", // Current user is owner
    avatarUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=100&h=100&fit=crop",
    members: [
      { userId: "046b1c94-83c7-45bb-a6b9-9d02b3b6a8a1", userName: "Max Mustermann", role: "owner", joinedAt: "2024-04-01T10:00:00Z" },
    ],
  },
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
    reservationUrl: "https://reservierung.activity.com",
    menuUrl: "https://speisekarte.activity.com",
    facebook: "https://www.facebook.com/mastersofescape",
    instagram: "https://www.instagram.com/mastersofescape",
    contactPhone: "0732272999",
    contactEmail: "office@mastersofescape.at",
    maxCapacity: 100,
    outdoorSeating: false,
    coordinates: [48.3129, 14.2830],
  },
  // ... (more activities would be here)
];

let mockFavoriteCounts: Record<string, number> = {
  "act-1": 5,
};
mockActivities.forEach((a) => {
  a.favoritesCount = mockFavoriteCounts[a.id] || 0;
});
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
    excludedActivityIds: [],
    activityVotes: [],
    dateOptions: [],
    participants: [
      { userId: "user-current", userName: "Max Mustermann", isOrganizer: true, hasVoted: true },
    ],
    createdAt: "2024-11-01T09:00:00Z",
    // Keep in sync with mock currentUser.id defined below to ensure owner checks work
    createdByUserId: "046b1c94-83c7-45bb-a6b9-9d02b3b6a8a1",
  }
];

let favoriteActivityIds: string[] = ["act-1"];

const currentUser: User = {
  id: "046b1c94-83c7-45bb-a6b9-9d02b3b6a8a1", // Backend Mock User ID
  name: "Max Mustermann",
  firstName: "Max",
  lastName: "Mustermann",
  email: "max.mustermann@firma.at",
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
    firstName: apiUser.first_name,
    lastName: apiUser.last_name,
    name: `${apiUser.first_name} ${apiUser.last_name}`.trim(),
    avatarUrl: apiUser.avatar_url,
    phone: apiUser.phone,
    department: apiUser.department,
    position: apiUser.position,
    location: apiUser.location,
    birthday: apiUser.birthday,
    bio: apiUser.bio,
    hobbies: apiUser.hobbies || [],
    activityPreferences: apiUser.activity_preferences,
    dietaryRestrictions: apiUser.dietary_restrictions || [],
    allergies: apiUser.allergies || [],
    preferredGroupSize: apiUser.preferred_group_size,
    travelWillingness: apiUser.travel_willingness,
    budgetPreference: apiUser.budget_preference,
    createdAt: apiUser.created_at,
    isActive: apiUser.is_active,
    favoriteActivityIds: apiUser.favorite_activity_ids,
  } as unknown as User;
}

function mapRoomFromApi(apiRoom: any): Room {
  if (!apiRoom) return apiRoom;
  return {
    id: apiRoom.id,
    name: apiRoom.name,
    description: apiRoom.description,
    inviteCode: apiRoom.invite_code || apiRoom.inviteCode,
    memberCount: apiRoom.member_count ?? apiRoom.memberCount ?? 0,
    createdAt: apiRoom.created_at ?? apiRoom.createdAt,
    createdByUserId: apiRoom.created_by_user_id ?? apiRoom.createdByUserId,
    avatarUrl: apiRoom.avatar_url ?? apiRoom.avatarUrl,
    members: (apiRoom.members || []).map((member: any) => ({
      userId: member.user_id ?? member.userId,
      userName: member.user_name ?? member.userName ?? member.name,
      avatarUrl: member.avatar_url ?? member.avatarUrl,
      role: member.role,
      joinedAt: member.joined_at ?? member.joinedAt,
    })),
  } as Room;
}

export async function login(email: string, password: string): Promise<ApiResult<User>> {
  if (USE_MOCKS) {
    const result = await mockLogin(email, password);
    if (result.data) {
      setStoredToken("mock-token");
    }
    return result;
  }

  try {
    const body = new URLSearchParams();
    body.append("username", email);
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

export async function register(user: { email: string; firstName: string; lastName: string; password: string }): Promise<ApiResult<User>> {
  if (USE_MOCKS) {
    const mockUser: User = {
      id: `user-${Date.now()}`,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`.trim(),
      avatarUrl: "",
      department: "",
      createdAt: new Date().toISOString(),
      isActive: true,
    } as any;
    setStoredToken("mock-token");
    return { data: mockUser };
  }

  try {
    const payload = {
      email: user.email,
      password: user.password,
      first_name: user.firstName,
      last_name: user.lastName,
    };

    const response = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
  const result = await request<any>('/users/me');
  if (result.data) {
    return { data: mapUserFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function updateUser(updates: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  position?: string;
  location?: string;
  birthday?: string;
  bio?: string;
  hobbies?: string[];
  activityPreferences?: any;
  dietaryRestrictions?: string[];
  allergies?: string[];
  preferredGroupSize?: string;
  travelWillingness?: string;
  budgetPreference?: string;
  avatarUrl?: string;
}): Promise<ApiResult<User | null>> {
  if (USE_MOCKS) {
    await delay(200);
    if (!isLoggedIn) {
      return { data: null, error: { code: "UNAUTHORIZED", message: "Nicht angemeldet" } };
    }

    // Update mock user
    Object.assign(currentUser, updates);
    if (updates.firstName || updates.lastName) {
       currentUser.firstName = updates.firstName || currentUser.firstName;
       currentUser.lastName = updates.lastName || currentUser.lastName;
       currentUser.name = `${currentUser.firstName} ${currentUser.lastName}`.trim();
    }
    return { data: currentUser };
  }

  // Convert camelCase to snake_case for API
  const apiUpdates: any = {};
  if (updates.firstName !== undefined) apiUpdates.first_name = updates.firstName;
  if (updates.lastName !== undefined) apiUpdates.last_name = updates.lastName;
  if (updates.phone !== undefined) apiUpdates.phone = updates.phone;
  if (updates.department !== undefined) apiUpdates.department = updates.department;
  if (updates.position !== undefined) apiUpdates.position = updates.position;
  if (updates.location !== undefined) apiUpdates.location = updates.location;
  if (updates.birthday !== undefined) apiUpdates.birthday = updates.birthday;
  if (updates.bio !== undefined) apiUpdates.bio = updates.bio;
  if (updates.hobbies !== undefined) apiUpdates.hobbies = updates.hobbies;
  if (updates.activityPreferences !== undefined) apiUpdates.activity_preferences = updates.activityPreferences;
  if (updates.dietaryRestrictions !== undefined) apiUpdates.dietary_restrictions = updates.dietaryRestrictions;
  if (updates.allergies !== undefined) apiUpdates.allergies = updates.allergies;
  if (updates.preferredGroupSize !== undefined) apiUpdates.preferred_group_size = updates.preferredGroupSize;
  if (updates.travelWillingness !== undefined) apiUpdates.travel_willingness = updates.travelWillingness;
  if (updates.budgetPreference !== undefined) apiUpdates.budget_preference = updates.budgetPreference;
  if (updates.avatarUrl !== undefined) apiUpdates.avatar_url = updates.avatarUrl;

  const result = await request<any>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(apiUpdates),
  });

  if (result.data) {
    return { data: mapUserFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function getAvatarUploadUrl(
  contentType: string,
  fileSize: number
): Promise<ApiResult<AvatarUploadInfo>> {
  if (USE_MOCKS) {
    await delay(50);
    return {
      data: {
        uploadUrl: "https://example.com/mock-upload",
        publicUrl: `https://picsum.photos/seed/${Date.now()}/200`,
      },
    };
  }

  const result = await request<any>("/users/me/avatar/upload-url", {
    method: "POST",
    body: JSON.stringify({ content_type: contentType, file_size: fileSize }),
  });
  if (result.data) {
    return {
      data: {
        uploadUrl: (result.data as any).upload_url ?? (result.data as any).uploadUrl,
        publicUrl: (result.data as any).public_url ?? (result.data as any).publicUrl,
      },
    };
  }
  return { data: null as any, error: result.error };
}

export async function uploadAvatar(file: File): Promise<ApiResult<User | null>> {
  const presign = await getAvatarUploadUrl(file.type, file.size);
  if (presign.error || !presign.data) {
    return { data: null, error: presign.error };
  }

  const putRes = await fetch(presign.data.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!putRes.ok) {
    const msg = `Upload fehlgeschlagen (HTTP ${putRes.status})`;
    return { data: null, error: { code: String(putRes.status), message: msg } };
  }

  return await updateUser({ avatarUrl: presign.data.publicUrl });
}

export async function getUserStats(): Promise<ApiResult<UserStats>> {
  if (USE_MOCKS) {
    await delay(200);
    return { 
      data: {
        upcomingEventsCount: 2,
        openVotesCount: 3
      }
    };
  }
  const result = await request<any>('/users/me/stats');
  if (result.data) {
    return { 
      data: {
        upcomingEventsCount: result.data.upcoming_events_count,
        openVotesCount: result.data.open_votes_count,
      }
    };
  }
  return { data: { upcomingEventsCount: 0, openVotesCount: 0 }, error: result.error };
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
    galleryUrls: apiActivity.gallery_urls || [],
    season: apiActivity.season,
    riskLevel: apiActivity.risk_level,

    typicalDurationHours: apiActivity.typical_duration_hours,
    recommendedGroupSizeMin: apiActivity.recommended_group_size_min,
    recommendedGroupSizeMax: apiActivity.recommended_group_size_max,
    groupSizeMin: apiActivity.recommended_group_size_min, // Fallback/Alias
    groupSizeMax: apiActivity.recommended_group_size_max, // Fallback/Alias
    minParticipants: apiActivity.recommended_group_size_min, // Fallback
    maxCapacity: apiActivity.max_capacity,

    physicalIntensity: apiActivity.physical_intensity,
    mentalChallenge: apiActivity.mental_challenge,
    socialInteractionLevel: apiActivity.social_interaction_level,
    competitionLevel: apiActivity.competition_level,

    accessibilityFlags: apiActivity.accessibility_flags || [],
    weatherDependent: apiActivity.weather_dependent,

    externalRating: apiActivity.external_rating,
    favoritesCount: apiActivity.favorites_count || apiActivity.favoritesCount || 0,
    primaryGoal: apiActivity.primary_goal,
    tags: apiActivity.tags || [],

    travelTimeMinutes: apiActivity.travel_time_from_office_minutes,
    travelTimeMinutesWalking: apiActivity.travel_time_from_office_minutes_walking,

    provider: apiActivity.provider,
    website: apiActivity.website,
    reservationUrl: apiActivity.reservation_url,
    menuUrl: apiActivity.menu_url,
    facebook: apiActivity.facebook,
    instagram: apiActivity.instagram,
    outdoorSeating: apiActivity.outdoor_seating,
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
  const result = await request<any[]>('/rooms');
  if (result.data) {
    return { data: result.data.map(mapRoomFromApi) };
  }
  return { data: [], error: result.error };
}

export async function getRoomById(id: string): Promise<ApiResult<Room | null>> {
  if (USE_MOCKS) {
    await delay(200);
    const room = mockRooms.find((r) => r.id === id) || null;
    return { data: room };
  }
  const result = await request<any>(`/rooms/${id}`);
  if (result.data) {
    return { data: mapRoomFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function createRoom(input: { name: string; description?: string }): Promise<ApiResult<Room>> {
  if (USE_MOCKS) {
    await delay(400);
    const newRoom: Room = {
      id: `room-${Date.now()}`,
      name: input.name,
      description: input.description,
      inviteCode: generateInviteCode(),
      memberCount: 1,
      createdAt: new Date().toISOString(),
      createdByUserId: "user-current",
      avatarUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&h=100&fit=crop",
    };
    mockRooms.push(newRoom);
    return { data: newRoom };
  }
  const result = await request<any>('/rooms', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (result.data) {
    return { data: mapRoomFromApi(result.data) };
  }
  return { data: null as any, error: result.error };
}

export async function deleteRoom(roomId: string): Promise<ApiResult<void>> {
  if (USE_MOCKS) {
    await delay(300);
    const index = mockRooms.findIndex((r) => r.id === roomId);
    if (index === -1) {
      return {
        data: null as any,
        error: { code: "NOT_FOUND", message: "Raum nicht gefunden" }
      };
    }
    mockRooms.splice(index, 1);
    // Also delete all events associated with this room
    events = events.filter((e) => e.roomId !== roomId);
    return { data: undefined };
  }
  return request<void>(`/rooms/${roomId}`, {
    method: 'DELETE',
  });
}

export async function joinRoom(inviteCode: string): Promise<ApiResult<Room>> {
  if (USE_MOCKS) {
    await delay(400);
    const room = mockRooms.find((r) => r.inviteCode === inviteCode);
    if (!room) {
      return {
        data: null as any,
        error: { code: "NOT_FOUND", message: "Raum mit diesem Code nicht gefunden" }
      };
    }
    // Increment member count when joining
    room.memberCount += 1;
    return { data: room };
  }
  const result = await request<any>('/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ invite_code: inviteCode }),
  });
  if (result.data) {
    return { data: mapRoomFromApi(result.data) };
  }
  return { data: null as any, error: result.error };
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

export async function getRoomMembers(roomId: string): Promise<ApiResult<RoomMember[]>> {
  if (USE_MOCKS) {
    await delay(200);
    // Mock members data
    const mockMembers: RoomMember[] = [
      {
        id: "user-current",
        name: "Max Mustermann",
        email: "max.mustermann@firma.at",
        username: "max",
        avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
        role: "owner",
        joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "user-2",
        name: "Anna Schmidt",
        email: "anna.schmidt@firma.at",
        username: "anna",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
        role: "admin",
        joinedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "user-3",
        name: "Peter Müller",
        email: "peter.mueller@firma.at",
        username: "peter",
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
        role: "member",
        joinedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    return { data: mockMembers };
  }
  const result = await request<any[]>(`/rooms/${roomId}/members`);
  if (result.data) {
    const members = result.data.map((m: any) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      username: m.name,
      avatarUrl: m.avatar_url,
      role: m.role,
      joinedAt: m.joined_at,
    }));
    return { data: members };
  }
  return { data: [], error: result.error };
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
    excludedActivityIds: apiEvent.excluded_activity_ids || apiEvent.excludedActivityIds || [],
    activityVotes: activityVotes,
    chosenActivityId: apiEvent.chosen_activity_id || apiEvent.chosenActivityId,
    
    dateOptions: (apiEvent.date_options || apiEvent.dateOptions || []).map((do_: any) => ({
      ...do_,
      startTime: do_.start_time || do_.startTime,
      endTime: do_.end_time || do_.endTime,
      responses: (do_.responses || []).map((r: any) => ({
        ...r,
        userId: r.user_id || r.userId,
        userName: r.user_name || r.userName,
        avatarUrl: r.user_avatar || r.avatarUrl,
        isPriority: r.is_priority !== undefined ? r.is_priority : r.isPriority,
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

export async function deleteEvent(eventId: string): Promise<ApiResult<void>> {
  if (USE_MOCKS) {
    await delay(200);
    const index = events.findIndex((e) => e.id === eventId);
    if (index === -1) {
      return {
        data: null as any,
        error: { code: "NOT_FOUND", message: "Event nicht gefunden" },
      };
    }
    const event = events[index];
    if (event.createdByUserId !== currentUser.id) {
      return {
        data: null as any,
        error: { code: "FORBIDDEN", message: "Nur der Ersteller kann das Event löschen" },
      };
    }
    events.splice(index, 1);
    return { data: undefined };
  }
  return request<void>(`/events/${eventId}`, {
    method: "DELETE",
  });
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

export async function removeProposedActivity(eventId: string, activityId: string): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    await delay(150);
    const event = events.find((e) => e.id === eventId);
    if (!event) return { data: null, error: { code: "NOT_FOUND", message: "Event nicht gefunden" } };

    if (event.createdByUserId !== currentUser.id) {
      return { data: null, error: { code: "FORBIDDEN", message: "Nur der Ersteller kann Vorschläge entfernen" } };
    }

    event.proposedActivityIds = event.proposedActivityIds.filter((id) => id !== activityId);
    event.activityVotes = event.activityVotes.filter((v) => v.activityId !== activityId);
    // Also remove from excluded if it was there
    event.excludedActivityIds = event.excludedActivityIds?.filter((id) => id !== activityId) || [];
    return { data: event };
  }

  const result = await request<any>(`/events/${eventId}/proposed-activities/${activityId}`, {
    method: 'DELETE',
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function excludeActivity(eventId: string, activityId: string): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    await delay(150);
    const event = events.find((e) => e.id === eventId);
    if (!event) return { data: null, error: { code: "NOT_FOUND", message: "Event nicht gefunden" } };

    if (event.createdByUserId !== currentUser.id) {
      return { data: null, error: { code: "FORBIDDEN", message: "Nur der Ersteller kann Aktivitäten ausschließen" } };
    }

    if (!event.excludedActivityIds) {
      event.excludedActivityIds = [];
    }
    if (!event.excludedActivityIds.includes(activityId)) {
      event.excludedActivityIds.push(activityId);
    }
    event.updatedAt = new Date().toISOString();
    return { data: event };
  }

  const result = await request<any>(`/events/${eventId}/activities/${activityId}/exclude`, {
    method: 'PATCH',
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function includeActivity(eventId: string, activityId: string): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    await delay(150);
    const event = events.find((e) => e.id === eventId);
    if (!event) return { data: null, error: { code: "NOT_FOUND", message: "Event nicht gefunden" } };

    if (event.createdByUserId !== currentUser.id) {
      return { data: null, error: { code: "FORBIDDEN", message: "Nur der Ersteller kann Aktivitäten wieder aufnehmen" } };
    }

    if (event.excludedActivityIds) {
      event.excludedActivityIds = event.excludedActivityIds.filter((id) => id !== activityId);
    }
    event.updatedAt = new Date().toISOString();
    return { data: event };
  }

  const result = await request<any>(`/events/${eventId}/activities/${activityId}/include`, {
    method: 'PATCH',
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

export async function addDateOption(eventId: string, date: string, startTime?: string, endTime?: string): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    await delay(200);
    const event = events.find((e) => e.id === eventId);
    if (event) {
      event.dateOptions.push({
        id: `do-${Date.now()}`,
        date,
        startTime,
        endTime,
        responses: [],
      });
      return { data: event };
    }
    return { data: null };
  }
  const result = await request<any>(`/events/${eventId}/date-options`, {
    method: 'POST',
    body: JSON.stringify({ date, start_time: startTime, end_time: endTime }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function deleteDateOption(eventId: string, dateOptionId: string): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    await delay(200);
    const event = events.find((e) => e.id === eventId);
    if (event) {
      event.dateOptions = event.dateOptions.filter((d) => d.id !== dateOptionId);
      return { data: event };
    }
    return { data: null };
  }
  const result = await request<any>(`/events/${eventId}/date-options/${dateOptionId}`, {
    method: 'DELETE',
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function respondToDateOption(eventId: string, dateOptionId: string, response: DateResponseType, isPriority: boolean = false, contribution?: number): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    await delay(200);
    const event = events.find((e) => e.id === eventId);
    if (event) {
      const dateOption = event.dateOptions.find((d) => d.id === dateOptionId);
      if (dateOption) {
        // If priority is set, unset for other options for this user
        if (isPriority) {
          event.dateOptions.forEach(d => {
            const resp = d.responses.find(r => r.userId === currentUser.id);
            if (resp) resp.isPriority = false;
          });
        }
        
        dateOption.responses = dateOption.responses.filter((r) => r.userId !== currentUser.id);
        dateOption.responses.push({
          userId: currentUser.id,
          userName: currentUser.name,
          response,
          isPriority,
          contribution,
        });
      }
      return { data: event };
    }
    return { data: null };
  }
  const result = await request<any>(`/events/${eventId}/date-options/${dateOptionId}/response`, {
    method: 'POST',
    body: JSON.stringify({ response, is_priority: isPriority, contribution }),
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
  if (USE_MOCKS) {
    await delay(100);
    return { data: favoriteActivityIds };
  }
  const res = await request<string[]>('/activities/favorites');
  if (res.error) {
    return { data: [], error: res.error };
  }
  return res;
}

export async function toggleFavorite(activityId: string): Promise<ApiResult<{ isFavorite: boolean; favoritesCount: number }>> {
  if (USE_MOCKS) {
    await delay(150);
    const index = favoriteActivityIds.indexOf(activityId);
    let updatedCount = mockFavoriteCounts[activityId] || 0;
    if (index > -1) {
      favoriteActivityIds.splice(index, 1);
      mockFavoriteCounts[activityId] = Math.max((mockFavoriteCounts[activityId] || 1) - 1, 0);
      updatedCount = mockFavoriteCounts[activityId] || 0;
      const activity = mockActivities.find((a) => a.id === activityId);
      if (activity) activity.favoritesCount = updatedCount;
      return { data: { isFavorite: false, favoritesCount: updatedCount } };
    } else {
      favoriteActivityIds.push(activityId);
      mockFavoriteCounts[activityId] = (mockFavoriteCounts[activityId] || 0) + 1;
      updatedCount = mockFavoriteCounts[activityId];
      const activity = mockActivities.find((a) => a.id === activityId);
      if (activity) activity.favoritesCount = updatedCount;
      return { data: { isFavorite: true, favoritesCount: updatedCount } };
    }
  }
  const res = await request<{ is_favorite: boolean; favorites_count: number }>(`/activities/${activityId}/favorite`, {
    method: 'POST',
  });
  if (res.data) {
    return {
      data: {
        isFavorite: (res.data as any).is_favorite ?? (res.data as any).isFavorite,
        favoritesCount: (res.data as any).favorites_count ?? (res.data as any).favoritesCount,
      },
    };
  }
  return { data: null as any, error: res.error };
}

export async function isFavorite(activityId: string): Promise<ApiResult<{ isFavorite: boolean; favoritesCount: number }>> {
  if (USE_MOCKS) {
    await delay(50);
    return { data: { isFavorite: favoriteActivityIds.includes(activityId), favoritesCount: mockFavoriteCounts[activityId] || 0 } };
  }
  const res = await request<{ is_favorite: boolean; favorites_count: number }>(`/activities/${activityId}/favorite`);
  if (res.data) {
    return { data: { isFavorite: (res.data as any).is_favorite ?? (res.data as any).isFavorite, favoritesCount: (res.data as any).favorites_count ?? (res.data as any).favoritesCount } };
  }
  return { data: { isFavorite: false, favoritesCount: 0 }, error: res.error };
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

// --- Comments ---

function mapCommentFromApi(apiComment: any): EventComment {
  return {
    id: apiComment.id,
    eventId: apiComment.event_id,
    userId: apiComment.user_id,
    content: apiComment.content,
    phase: apiComment.phase,
    createdAt: apiComment.created_at,
    userName: apiComment.user_name,
    userAvatar: apiComment.user_avatar,
  } as EventComment;
}

export async function getEventComments(eventId: string, phase?: EventPhase, skip = 0, limit = 50): Promise<ApiResult<EventComment[]>> {
  if (USE_MOCKS) {
    await delay(300);
    // Mock comments
    const mockComments: EventComment[] = [
      {
        id: "c1", eventId, userId: "u2", content: "Super Idee!", phase: "proposal", createdAt: new Date().toISOString(), userName: "Anna", userAvatar: ""
      },
      {
        id: "c2", eventId, userId: "u3", content: "Bin dabei.", phase: "voting", createdAt: new Date().toISOString(), userName: "Tom", userAvatar: ""
      }
    ].filter(c => !phase || c.phase === phase);
    return { data: mockComments };
  }
  
  let url = `/events/${eventId}/comments?skip=${skip}&limit=${limit}`;
  if (phase) url += `&phase=${phase}`;
  
  const result = await request<any[]>(url);
  if (result.data) {
    return { data: result.data.map(mapCommentFromApi) };
  }
  return { data: [], error: result.error };
}

export async function createEventComment(eventId: string, content: string, phase: EventPhase): Promise<ApiResult<EventComment>> {
  if (USE_MOCKS) {
    await delay(300);
    return { 
      data: {
        id: `c-${Date.now()}`, eventId, userId: currentUser.id, content, phase, createdAt: new Date().toISOString(), userName: currentUser.name, userAvatar: currentUser.avatarUrl
      }
    };
  }
  
  const result = await request<any>(`/events/${eventId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, phase }),
  });
  
  if (result.data) {
    return { data: mapCommentFromApi(result.data) };
  }
  return { data: null as any, error: result.error };
}

export async function deleteEventComment(eventId: string, commentId: string): Promise<ApiResult<void>> {
  if (USE_MOCKS) {
    await delay(150);
    return { data: undefined };
  }

  const result = await request<void>(`/events/${eventId}/comments/${commentId}`, {
    method: 'DELETE',
  });
  if (result.error) {
    return { data: undefined as any, error: result.error };
  }
  return { data: undefined as any };
}

function mapActivityCommentFromApi(apiComment: any): ActivityComment {
  return {
    id: apiComment.id,
    activityId: apiComment.activity_id || apiComment.activityId,
    userId: apiComment.user_id || apiComment.userId,
    content: apiComment.content,
    createdAt: apiComment.created_at || apiComment.createdAt,
    userName: apiComment.user_name || apiComment.userName,
    userAvatar: apiComment.user_avatar || apiComment.userAvatar,
  } as ActivityComment;
}

export async function getActivityComments(activityId: string, skip = 0, limit = 50): Promise<ApiResult<ActivityComment[]>> {
  if (USE_MOCKS) {
    await delay(300);
    // Mock comments
    const mockComments: ActivityComment[] = [
      {
        id: "ac1", activityId, userId: "u2", content: "War letztes Jahr super!", createdAt: new Date(Date.now() - 100000000).toISOString(), userName: "Anna", userAvatar: ""
      },
      {
        id: "ac2", activityId, userId: "u3", content: "Kann ich empfehlen.", createdAt: new Date().toISOString(), userName: "Tom", userAvatar: ""
      }
    ];
    return { data: mockComments };
  }
  
  const result = await request<any[]>(`/activities/${activityId}/comments?skip=${skip}&limit=${limit}`);
  if (result.data) {
    return { data: result.data.map(mapActivityCommentFromApi) };
  }
  return { data: [], error: result.error };
}

export async function createActivityComment(activityId: string, content: string): Promise<ApiResult<ActivityComment>> {
  if (USE_MOCKS) {
    await delay(300);
    return { 
      data: {
        id: `ac-${Date.now()}`, activityId, userId: currentUser.id, content, createdAt: new Date().toISOString(), userName: currentUser.name, userAvatar: currentUser.avatarUrl
      }
    };
  }
  
  const result = await request<any>(`/activities/${activityId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  
  if (result.data) {
    return { data: mapActivityCommentFromApi(result.data) };
  }
  return { data: null as any, error: result.error };
}

export async function deleteActivityComment(activityId: string, commentId: string): Promise<ApiResult<void>> {
  if (USE_MOCKS) {
    await delay(150);
    return { data: undefined };
  }

  const result = await request<void>(`/activities/${activityId}/comments/${commentId}`, {
    method: 'DELETE',
  });
  if (result.error) {
    return { data: undefined as any, error: result.error };
  }
  return { data: undefined as any };
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
