import type { Room, Activity, Event, User, EventPhase, VoteType, DateResponseType, EventTimeWindow, EventCategory, PrimaryGoal, UserStats, EventComment, ActivityComment, BudgetType } from "@/types/domain";
import type { CreateEventInput } from "@/schemas";
import type { ApiResult } from "@/types/api";
import type { ApiUser, ApiRoom, ApiActivity, ApiEvent, ApiEventComment, ApiActivityComment, ApiTokenResponse, ApiUserStats, ApiDateOption, ApiActivityVote, ApiEventParticipant } from "@/types/apiDomain";
import { fetchJwtToken, signInWithEmail, signOutUser, signUpWithEmail } from "@/lib/authClient";

export interface AvatarUploadInfo {
  uploadUrl: string;
  publicUrl: string;
  uploadKey: string;
}

// ============================================ 
// CONFIG & HELPERS
// ============================================ 

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
const API_BASE = '/api/v1';
type CachedBearer = { token: string; expiresAt: number };
let cachedBearer: CachedBearer | null = null;

const decodeJwtExpiry = (token: string): number | null => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload?.exp) {
      return Number(payload.exp) * 1000;
    }
  } catch {
    /* ignore parse errors */
  }
  return null;
};

const setCachedToken = (token: string | null) => {
  if (!token) {
    cachedBearer = null;
    return;
  }
  const expiry = decodeJwtExpiry(token);
  const fallbackExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
  cachedBearer = {
    token,
    expiresAt: expiry ? expiry - 5000 : fallbackExpiry,
  };
};

const getAuthHeader = async (): Promise<HeadersInit> => {
  if (USE_MOCKS) {
    return {};
  }
  if (cachedBearer && cachedBearer.expiresAt > Date.now()) {
    return { Authorization: `Bearer ${cachedBearer.token}` };
  }
  const token = await fetchJwtToken();
  if (token) {
    setCachedToken(token);
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

async function request<T>(endpoint: string, options?: RequestInit): Promise<ApiResult<T>> {
  const authHeader = await getAuthHeader();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
    ...authHeader,
  };

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
        errorMessage = (data as ApiError).detail;
      } else if (typeof data === 'string' && data.length > 0) {
        errorMessage = data;
      }

      return { 
        data: undefined, 
        error: { code: String(response.status), message: errorMessage } 
      };
    }
    
    // Return data, ensuring it's not the string "null"
    if (data === "null") data = null;
    return { data: data as T };
  } catch (e) {
    return { 
      data: undefined, 
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

const mockFavoriteCounts: Record<string, number> = {
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
    avatarUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&h=400&fit=crop",
    unreadMessageCount: 4,
    proposedActivityIds: ["act-1"],
    excludedActivityIds: [],
    activityVotes: [],
    dateOptions: [],
    participants: [
      { userId: "user-current", userName: "Max Mustermann", isOrganizer: true, hasVoted: true },
      { userId: "user-2", userName: "Anna Schmidt", isOrganizer: false, hasVoted: false },
      { userId: "user-3", userName: "Tom Weber", isOrganizer: false, hasVoted: true },
      { userId: "user-4", userName: "Lisa Novak", isOrganizer: false, hasVoted: false },
    ],
    createdAt: "2024-11-01T09:00:00Z",
    // Keep in sync with mock currentUser.id defined below to ensure owner checks work
    createdByUserId: "046b1c94-83c7-45bb-a6b9-9d02b3b6a8a1",
  }
];

const favoriteActivityIds: string[] = ["act-1"];

const currentUser: User = {
  id: "046b1c94-83c7-45bb-a6b9-9d02b3b6a8a1", // Backend Mock User ID
  name: "Max Mustermann",
  firstName: "Max",
  lastName: "Mustermann",
  email: "max.mustermann@firma.at",
  avatarUrl: "",
  department: "Marketing",
  createdAt: "2024-01-01T00:00:00Z",
  isActive: true,
  favoriteActivityIds: favoriteActivityIds,
};

// ============================================ 
// API FUNCTIONS
// ============================================ 

// --- Auth ---

function mapUserFromApi(apiUser: ApiUser): User {
  if (!apiUser) return undefined as unknown as User;
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

function mapRoomFromApi(apiRoom: ApiRoom): Room {
  if (!apiRoom) return apiRoom as unknown as Room;
  return {
    id: apiRoom.id,
    name: apiRoom.name,
    description: apiRoom.description,
    inviteCode: apiRoom.invite_code || apiRoom.inviteCode,
    memberCount: apiRoom.member_count ?? apiRoom.memberCount ?? 0,
    createdAt: apiRoom.created_at ?? apiRoom.createdAt,
    createdByUserId: apiRoom.created_by_user_id ?? apiRoom.createdByUserId,
    avatarUrl: apiRoom.avatar_url ?? apiRoom.avatarUrl,
    members: (apiRoom.members || []).map((member) => ({
      userId: member.user_id ?? member.userId,
      userName: member.user_name ?? member.userName ?? member.name,
      avatarUrl: member.avatar_url ?? member.avatarUrl,
      role: member.role,
      joinedAt: member.joined_at ?? member.joinedAt,
    })),
  };
}

export async function login(email: string, password: string): Promise<ApiResult<User>> {
  if (USE_MOCKS) {
    const result = await mockLogin(email, password);
    if (result.data) {
      setCachedToken("mock-token");
    }
    return result;
  }

  try {
    await signInWithEmail(email, password);
    setCachedToken(null); // force refresh from /api/auth/token
    const profile = await getCurrentUser();
    if (profile.data) {
      return { data: profile.data };
    }
    return {
      data: undefined,
      error: profile.error ?? { code: "AUTH_ERROR", message: "Login fehlgeschlagen" },
    };
  } catch (e) {
    return {
      data: undefined,
      error: { code: "AUTH_ERROR", message: e instanceof Error ? e.message : "Login fehlgeschlagen" },
    };
  }
}

export async function register(user: { email: string; firstName: string; lastName: string; password: string }): Promise<ApiResult<User>> {
  if (USE_MOCKS) {
    const mockUser: Partial<User> = {
      id: `user-${Date.now()}`,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`.trim(),
      avatarUrl: "",
      department: "",
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    setCachedToken("mock-token");
    return { data: mockUser };
  }

  try {
    await signUpWithEmail({
      email: user.email,
      password: user.password,
      name: `${user.firstName} ${user.lastName}`.trim(),
    });
    setCachedToken(null);
    const profile = await getCurrentUser();
    if (profile.data) {
      return { data: profile.data };
    }
    return {
      data: undefined,
      error: profile.error ?? { code: "AUTH_ERROR", message: "Registrierung fehlgeschlagen" },
    };
  } catch (e) {
    return { data: undefined, error: { code: "NETWORK_ERROR", message: e instanceof Error ? e.message : "Netzwerkfehler" } };
  }
}

export async function logout(): Promise<void> {
  try {
    await signOutUser();
  } catch (e) {
    console.warn("Better Auth sign out failed", e);
  }
  setCachedToken(null);
}

export async function getCurrentUser(): Promise<ApiResult<User | null>> {
  if (USE_MOCKS) {
    await delay(100);
    return { data: isLoggedIn ? currentUser : null };
  }
  const result = await request<ApiUser>('/users/me');
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
  activityPreferences?: unknown;
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
  const apiUpdates: ApiUserUpdate = {};
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

  const result = await request<ApiUser>('/users/me', {
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
        uploadKey: "avatars/mock-user/orig.png",
      },
    };
  }

  const result = await request<ApiAvatarUploadInfo>("/users/me/avatar/upload-url", {
    method: "POST",
    body: JSON.stringify({ content_type: contentType, file_size: fileSize }),
  });
  if (result.data) {
    return {
      data: {
        uploadUrl: result.data.upload_url ?? result.data.uploadUrl,
        publicUrl: result.data.public_url ?? result.data.publicUrl,
        uploadKey: result.data.upload_key ?? result.data.uploadKey,
      },
    };
  }
  return { data: null, error: result.error };
}

export async function processAvatarUpload(
  uploadKey: string,
  outputFormat: "webp" | "avif" | "jpeg" | "jpg" | "png" | undefined = "webp"
): Promise<ApiResult<User | null>> {
  if (USE_MOCKS) {
    await delay(80);
    currentUser.avatarUrl = `https://picsum.photos/seed/${Date.now()}/128`;
    return { data: currentUser };
  }

  const result = await request<ApiUser>("/users/me/avatar/process", {
    method: "POST",
    body: JSON.stringify({ upload_key: uploadKey, output_format: outputFormat }),
  });

  if (result.data) {
    return { data: mapUserFromApi(result.data) };
  }
  return { data: null, error: result.error };
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

  if (!presign.data.uploadKey) {
    return await updateUser({ avatarUrl: presign.data.publicUrl });
  }

  return await processAvatarUpload(presign.data.uploadKey, "webp");
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
  const result = await request<ApiUserStats>('/users/me/stats');
  if (result.data) {
    return { 
      data: {
        upcomingEventsCount: result.data.upcoming_events_count,
        openVotesCount: result.data.open_votes_count,
      }
    };
  }
  return { data: undefined, error: result.error };
}

// --- Activities ---

function mapActivityFromApi(apiActivity: ApiActivity): Activity {
  return {
    // Map snake_case to camelCase
    id: apiActivity.id,
    title: apiActivity.title,
    category: apiActivity.category as EventCategory,
    tags: apiActivity.tags || [],
    locationRegion: apiActivity.location_region as Region,
    locationCity: apiActivity.location_city,
    locationAddress: apiActivity.address || apiActivity.location_address, // support both aliases
    coordinates: apiActivity.coordinates,
    estPricePerPerson: apiActivity.est_price_pp || apiActivity.est_price_per_person,
    priceComment: apiActivity.price_comment,
    shortDescription: apiActivity.short_description,
    longDescription: apiActivity.long_description,
    imageUrl: apiActivity.image_url,
    galleryUrls: apiActivity.gallery_urls || [],
    season: apiActivity.season as Season,
    riskLevel: apiActivity.risk_level as RiskLevel,
    typicalDurationHours: apiActivity.typical_duration_hours,
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
    primaryGoal: apiActivity.primary_goal as PrimaryGoal,
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
    createdAt: apiActivity.created_at,
    updatedAt: apiActivity.updated_at,
  };
}

export async function getActivities(): Promise<ApiResult<Activity[]>> {
  if (USE_MOCKS) {
    await delay(400);
    return { data: mockActivities };
  }
  const result = await request<ApiActivity[]>('/activities');
  if (result.data) {
    return { data: result.data.map(mapActivityFromApi) };
  }
  return { data: undefined, error: result.error };
}

export async function getActivityById(id: string): Promise<ApiResult<Activity | null>> {
  if (USE_MOCKS) {
    await delay(200);
    const activity = mockActivities.find((a) => a.id === id) || null;
    return { data: activity };
  }
  const result = await request<ApiActivity>(`/activities/${id}`);
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
  const result = await request<ApiRoom[]>('/rooms');
  if (result.data) {
    return { data: result.data.map(mapRoomFromApi) };
  }
  return { data: undefined, error: result.error };
}

export async function getRoomById(id: string): Promise<ApiResult<Room | null>> {
  if (USE_MOCKS) {
    await delay(200);
    const room = mockRooms.find((r) => r.id === id) || null;
    return { data: room };
  }
  const result = await request<ApiRoom>(`/rooms/${id}`);
  if (result.data) {
    return { data: mapRoomFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function updateRoom(roomId: string, updates: { name?: string; description?: string; avatarUrl?: string }): Promise<ApiResult<Room | null>> {
  if (USE_MOCKS) {
    await delay(250);
    const idx = mockRooms.findIndex((r) => r.id === roomId);
    if (idx === -1) return { data: null, error: { code: "NOT_FOUND", message: "Raum nicht gefunden" } };
    mockRooms[idx] = { ...mockRooms[idx], ...updates };
    return { data: mockRooms[idx] };
  }

  const apiPayload: ApiRoomUpdate = {};
  if (updates.name !== undefined) apiPayload.name = updates.name;
  if (updates.description !== undefined) apiPayload.description = updates.description;
  if (updates.avatarUrl !== undefined) apiPayload.avatar_url = updates.avatarUrl;

  const result = await request<ApiRoom>(`/rooms/${roomId}`, {
    method: "PATCH",
    body: JSON.stringify(apiPayload),
  });
  if (result.data) {
    return { data: mapRoomFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function getRoomAvatarUploadUrl(roomId: string, contentType: string, fileSize: number): Promise<ApiResult<AvatarUploadInfo>> {
  if (USE_MOCKS) {
    await delay(80);
    return {
      data: {
        uploadUrl: "https://example.com/mock-upload",
        publicUrl: `https://picsum.photos/seed/room-${roomId}/256`,
        uploadKey: `rooms/${roomId}/orig.png`,
      },
    };
  }

  const result = await request<ApiAvatarUploadInfo>(`/rooms/${roomId}/avatar/upload-url`, {
    method: "POST",
    body: JSON.stringify({ content_type: contentType, file_size: fileSize }),
  });
  if (result.data) {
    return {
      data: {
        uploadUrl: result.data.upload_url ?? result.data.uploadUrl,
        publicUrl: result.data.public_url ?? result.data.publicUrl,
        uploadKey: result.data.upload_key ?? result.data.uploadKey,
      },
    };
  }
  return { data: null, error: result.error };
}

export async function processRoomAvatar(roomId: string, uploadKey: string, outputFormat: "webp" | "avif" | "jpeg" | "jpg" | "png" | undefined = "webp"): Promise<ApiResult<Room | null>> {
  if (USE_MOCKS) {
    await delay(120);
    const url = `https://picsum.photos/seed/room-${roomId}-${Date.now()}/256`;
    const idx = mockRooms.findIndex((r) => r.id === roomId);
    if (idx !== -1) mockRooms[idx].avatarUrl = url;
    return { data: idx !== -1 ? mockRooms[idx] : null };
  }

  const result = await request<ApiRoom>(`/rooms/${roomId}/avatar/process`, {
    method: "POST",
    body: JSON.stringify({ upload_key: uploadKey, output_format: outputFormat }),
  });
  if (result.data) {
    return { data: mapRoomFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function uploadRoomAvatar(roomId: string, file: File): Promise<ApiResult<Room | null>> {
  const presign = await getRoomAvatarUploadUrl(roomId, file.type, file.size);
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
    return { data: null, error: { code: String(putRes.status), message: "Upload fehlgeschlagen" } };
  }

  if (!presign.data.uploadKey) {
    return { data: null, error: { code: "UPLOAD_KEY_MISSING", message: "Upload key fehlt" } };
  }

  return await processRoomAvatar(roomId, presign.data.uploadKey, "webp");
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
  const result = await request<ApiRoom>('/rooms', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (result.data) {
    return { data: mapRoomFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
}

export async function deleteRoom(roomId: string): Promise<ApiResult<void>> {
  if (USE_MOCKS) {
    await delay(300);
    const index = mockRooms.findIndex((r) => r.id === roomId);
          return {
            data: undefined,
            error: { code: "NOT_FOUND", message: "Raum nicht gefunden" }
          };    mockRooms.splice(index, 1);
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
        data: undefined,
        error: { code: "NOT_FOUND", message: "Raum mit diesem Code nicht gefunden" }
      };
    }
    // Increment member count when joining
    room.memberCount += 1;
    return { data: room };
  }
  const result = await request<ApiRoom>('/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ invite_code: inviteCode }),
  });
  if (result.data) {
    return { data: mapRoomFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
}

export async function leaveRoom(roomId: string): Promise<ApiResult<void>> {
  if (USE_MOCKS) {
    await delay(300);
    const room = mockRooms.find((r) => r.id === roomId);
    if (!room) {
      return {
        data: undefined,
        error: { code: "NOT_FOUND", message: "Raum nicht gefunden" }
      };
    }
    if (room.createdByUserId === currentUser.id) {
      return {
        data: undefined,
        error: { code: "FORBIDDEN", message: "Der Raumersteller kann den Raum nicht verlassen" }
      };
    }
    
    // Check if user is member
    const memberIdx = room.members?.findIndex(m => m.userId === currentUser.id) ?? -1;
    if (memberIdx === -1) {
       return {
        data: undefined,
        error: { code: "BAD_REQUEST", message: "Du bist kein Mitglied dieses Raums" }
      };
    }

    // Remove member
    room.members?.splice(memberIdx, 1);
    room.memberCount = Math.max(0, room.memberCount - 1);
    
    return { data: undefined };
  }

  return request<void>(`/rooms/${roomId}/leave`, {
    method: 'POST',
  });
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
  const result = await request<ApiRoomMember[]>(`/rooms/${roomId}/members`);
  if (result.data) {
    const members = result.data.map((m: ApiRoomMember) => ({
      id: m.user_id,
      name: m.user_name || m.name || "",
      email: "", // Assuming email is not returned here, or needs to be fetched separately
      username: m.user_name || m.name || "",
      avatarUrl: m.avatar_url,
      role: m.role as RoomRole,
      joinedAt: m.joined_at,
    }));
    return { data: members };
  }
  return { data: undefined, error: result.error };
}

// --- Events ---

function mapEventFromApi(apiEvent: ApiEvent): Event {
  if (!apiEvent) return apiEvent as unknown as Event;

  // Transform activity_votes from backend format to frontend format
  // Backend: Array of { event_id, activity_id, user_id, vote, voted_at }
  // Frontend: Array of { activityId, votes: [{userId, userName, vote, votedAt}] }
  let activityVotes: ActivityVote[] = [];
  const rawVotes = apiEvent.activity_votes || [];

  // Check if already in frontend format (has "votes" property)
  if (rawVotes.length > 0 && (rawVotes[0] as ApiActivityVote).votes !== undefined) {
    // Already in frontend format
    activityVotes = rawVotes.map((av: ApiActivityVote) => ({
      ...av,
      activityId: av.activity_id || av.activityId,
      votes: (av.votes || []).map((v: ApiActivityVoteInner) => ({
        ...v,
        userId: v.user_id,
        userName: v.user_name,
        votedAt: v.voted_at,
      })),
    }));
  } else {
    // Backend format - group votes by activity_id
    const votesByActivity = new Map<string, ApiActivityVoteInner[]>();

    // Get all proposed activities
    const proposedIds = apiEvent.proposed_activity_ids || [];

    // Initialize with empty votes for all proposed activities
    proposedIds.forEach((activityId: string) => {
      votesByActivity.set(activityId, []);
    });

    // Group votes by activity
    (rawVotes as unknown as { activity_id: string }[]).forEach((vote: ApiActivityVoteInner) => { // Cast to any because the structure is uncertain
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
      votes: votes.map(v => ({
        userId: v.user_id,
        userName: v.user_name,
        vote: v.vote as VoteType,
        votedAt: v.voted_at,
      })),
    }));
  }

  return {
    id: apiEvent.id,
    roomId: apiEvent.room_id,
    name: apiEvent.name,
    description: apiEvent.description,
    phase: apiEvent.phase as EventPhase,
    timeWindow: apiEvent.time_window,
    votingDeadline: apiEvent.voting_deadline,
    budgetType: apiEvent.budget_type as BudgetType,
    budgetAmount: apiEvent.budget_amount,
    participantCountEstimate: apiEvent.participant_count_estimate,
    locationRegion: apiEvent.location_region as Region,
    avatarUrl: apiEvent.avatar_url,
    inviteSentAt: apiEvent.invite_sent_at,
    lastReminderAt: apiEvent.last_reminder_at,
    unreadMessageCount: apiEvent.unread_message_count,

    proposedActivityIds: apiEvent.proposed_activity_ids,
    excludedActivityIds: apiEvent.excluded_activity_ids || [],
    activityVotes: activityVotes,
    chosenActivityId: apiEvent.chosen_activity_id,
    
    dateOptions: (apiEvent.date_options || []).map((do_: ApiDateOption) => ({
      id: do_.id,
      date: do_.date,
      startTime: do_.start_time,
      endTime: do_.end_time,
      responses: (do_.responses || []).map((r: ApiDateResponse) => ({
        userId: r.user_id,
        userName: r.user_name,
        avatarUrl: r.user_avatar || r.avatar_url,
        response: r.response as DateResponseType,
        isPriority: r.is_priority,
        contribution: r.contribution,
      })),
    })),
    finalDateOptionId: apiEvent.final_date_option_id,
    
    participants: (apiEvent.participants || []).map((p: ApiEventParticipant) => ({
      userId: p.user_id,
      userName: p.user_name,
      avatarUrl: p.avatar_url,
      isOrganizer: p.is_organizer,
      hasVoted: p.has_voted,
      dateResponse: p.date_response as DateResponseType,
    })),
    
    createdAt: apiEvent.created_at,
    createdByUserId: apiEvent.created_by_user_id,
    updatedAt: apiEvent.updated_at,
  };
}

export async function getEventsByRoom(roomId: string): Promise<ApiResult<Event[]>> {
  if (USE_MOCKS) {
    await delay(300);
    const roomEvents = events.filter((e) => e.roomId === roomId);
    return { data: roomEvents };
  }
  const result = await request<ApiEvent[]>(`/rooms/${roomId}/events`);
  if (result.data) {
    return { data: result.data.map(mapEventFromApi) };
  }
  return { data: undefined, error: result.error };
}

export async function getEventById(eventId: string): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    await delay(200);
    const event = events.find((e) => e.id === eventId) || null;
    return { data: event };
  }
  const result = await request<ApiEvent>(`/events/${eventId}`);
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
        data: undefined,
        error: { code: "NOT_FOUND", message: "Event nicht gefunden" },
      };
    }
    const event = events[index];
    if (event.createdByUserId !== currentUser.id) {
      return {
        data: undefined,
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
  const apiPayload: ApiCreateEvent = {
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
  const result = await request<ApiEvent>(`/rooms/${roomId}/events`, {
    method: 'POST',
    body: JSON.stringify(apiPayload),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
}

export async function updateEvent(eventId: string, updates: { name?: string; description?: string; budgetType?: BudgetType; budgetAmount?: number; avatarUrl?: string; inviteSentAt?: string; lastReminderAt?: string; unreadMessageCount?: number }): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    await delay(200);
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return { data: null, error: { code: "NOT_FOUND", message: "Event nicht gefunden" } };
    }
    if (event.createdByUserId !== currentUser.id) {
      return { data: null, error: { code: "FORBIDDEN", message: "Nur der Ersteller kann das Event bearbeiten" } };
    }
    if (updates.name !== undefined) event.name = updates.name;
    if (updates.description !== undefined) event.description = updates.description;
    if (updates.budgetType !== undefined) event.budgetType = updates.budgetType;
    if (updates.budgetAmount !== undefined) event.budgetAmount = updates.budgetAmount;
    if (updates.avatarUrl !== undefined) event.avatarUrl = updates.avatarUrl;
    if (updates.inviteSentAt !== undefined) event.inviteSentAt = updates.inviteSentAt;
    if (updates.lastReminderAt !== undefined) event.lastReminderAt = updates.lastReminderAt;
    if (updates.unreadMessageCount !== undefined) event.unreadMessageCount = updates.unreadMessageCount;
    event.updatedAt = new Date().toISOString();
    return { data: event };
  }

  const payload: ApiEventUpdate = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.budgetType !== undefined) payload.budget_type = updates.budgetType;
  if (updates.budgetAmount !== undefined) payload.budget_amount = updates.budgetAmount;
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
  if (updates.inviteSentAt !== undefined) payload.invite_sent_at = updates.inviteSentAt;
  if (updates.lastReminderAt !== undefined) payload.last_reminder_at = updates.lastReminderAt;
  if (updates.unreadMessageCount !== undefined) payload.unread_message_count = updates.unreadMessageCount;

  const result = await request<ApiEvent>(`/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function getEventAvatarUploadUrl(eventId: string, contentType: string, fileSize: number): Promise<ApiResult<AvatarUploadInfo>> {
  if (USE_MOCKS) {
    await delay(50);
    return {
      data: {
        uploadUrl: "https://example.com/mock-upload",
        publicUrl: `https://picsum.photos/seed/event-${eventId}-${Date.now()}/400`,
        uploadKey: `events/mock/${eventId}/orig.png`,
      },
    };
  }
  const result = await request<ApiAvatarUploadInfo>(`/events/${eventId}/avatar/upload-url`, {
    method: "POST",
    body: JSON.stringify({ content_type: contentType, file_size: fileSize }),
  });
  if (result.data) {
    return {
      data: {
        uploadUrl: result.data.upload_url ?? result.data.uploadUrl,
        publicUrl: result.data.public_url ?? result.data.publicUrl,
        uploadKey: result.data.upload_key ?? result.data.uploadKey,
      },
    };
  }
  return { data: null, error: result.error };
}

export async function processEventAvatar(eventId: string, uploadKey: string, outputFormat: "webp" | "avif" | "jpeg" | "jpg" | "png" | undefined = "webp"): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    await delay(120);
    const url = `https://picsum.photos/seed/event-${eventId}-${Date.now()}/400/240`;
    const idx = events.findIndex((e) => e.id === eventId);
    if (idx !== -1) {
      events[idx].avatarUrl = url;
      events[idx].updatedAt = new Date().toISOString();
      return { data: events[idx] };
    }
    return { data: null, error: { code: "NOT_FOUND", message: "Event nicht gefunden" } };
  }

  const result = await request<ApiEvent>(`/events/${eventId}/avatar/process`, {
    method: "POST",
    body: JSON.stringify({ upload_key: uploadKey, output_format: outputFormat }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: null, error: result.error };
}

export async function uploadEventAvatar(eventId: string, file: File): Promise<ApiResult<Event | null>> {
  const presign = await getEventAvatarUploadUrl(eventId, file.type, file.size);
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
    return { data: null, error: { code: String(putRes.status), message: "Upload fehlgeschlagen" } };
  }

  if (!presign.data.uploadKey) {
    return await updateEvent(eventId, { avatarUrl: presign.data.publicUrl });
  }

  return await processEventAvatar(eventId, presign.data.uploadKey, "webp");
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
  const result = await request<ApiEvent>(`/events/${eventId}/phase`, {
    method: 'PATCH',
    body: JSON.stringify({ phase: newPhase }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
}

export async function removeProposedActivity(eventId: string, activityId: string): Promise<ApiResult<Event | null>> {
  if (USE_MOCKS) {
    await delay(150);
    const event = events.find((e) => e.id === eventId);
    if (!event) return { data: undefined, error: { code: "NOT_FOUND", message: "Event nicht gefunden" } };

    if (event.createdByUserId !== currentUser.id) {
      return { data: undefined, error: { code: "FORBIDDEN", message: "Nur der Ersteller kann Vorschläge entfernen" } };
    }

    event.proposedActivityIds = event.proposedActivityIds.filter((id) => id !== activityId);
    event.activityVotes = event.activityVotes.filter((v) => v.activityId !== activityId);
    // Also remove from excluded if it was there
    event.excludedActivityIds = event.excludedActivityIds?.filter((id) => id !== activityId) || [];
    return { data: event };
  }

  const result = await request<ApiEvent>(`/events/${eventId}/proposed-activities/${activityId}`, {
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
    if (!event) return { data: undefined, error: { code: "NOT_FOUND", message: "Event nicht gefunden" } };

    if (event.createdByUserId !== currentUser.id) {
      return { data: undefined, error: { code: "FORBIDDEN", message: "Nur der Ersteller kann Aktivitäten ausschließen" } };
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

  const result = await request<ApiEvent>(`/events/${eventId}/activities/${activityId}/exclude`, {
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
    if (!event) return { data: undefined, error: { code: "NOT_FOUND", message: "Event nicht gefunden" } };

    if (event.createdByUserId !== currentUser.id) {
      return { data: undefined, error: { code: "FORBIDDEN", message: "Nur der Ersteller kann Aktivitäten wieder aufnehmen" } };
    }

    if (event.excludedActivityIds) {
      event.excludedActivityIds = event.excludedActivityIds.filter((id) => id !== activityId);
    }
    event.updatedAt = new Date().toISOString();
    return { data: event };
  }

  const result = await request<ApiEvent>(`/events/${eventId}/activities/${activityId}/include`, {
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
  const result = await request<ApiEvent>(`/events/${eventId}/votes`, {
    method: 'POST',
    body: JSON.stringify({ activity_id: activityId, vote }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
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
  const result = await request<ApiEvent>(`/events/${eventId}/date-options`, {
    method: 'POST',
    body: JSON.stringify({ date, start_time: startTime, end_time: endTime }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
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
  const result = await request<ApiEvent>(`/events/${eventId}/date-options/${dateOptionId}`, {
    method: 'DELETE',
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
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
  const result = await request<ApiEvent>(`/events/${eventId}/date-options/${dateOptionId}/response`, {
    method: 'POST',
    body: JSON.stringify({ response, is_priority: isPriority, contribution }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
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
  const result = await request<ApiEvent>(`/events/${eventId}/select-activity`, {
    method: 'POST',
    body: JSON.stringify({ activity_id: activityId }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
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
  const result = await request<ApiEvent>(`/events/${eventId}/finalize-date`, {
    method: 'POST',
    body: JSON.stringify({ date_option_id: dateOptionId }),
  });
  if (result.data) {
    return { data: mapEventFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
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
        isFavorite: res.data.is_favorite ?? res.data.isFavorite,
        favoritesCount: res.data.favorites_count ?? res.data.favoritesCount,
      },
    };
  }
  return { data: undefined, error: res.error };
}

export async function isFavorite(activityId: string): Promise<ApiResult<{ isFavorite: boolean; favoritesCount: number }>> {
  if (USE_MOCKS) {
    await delay(50);
    return { data: { isFavorite: favoriteActivityIds.includes(activityId), favoritesCount: mockFavoriteCounts[activityId] || 0 } };
  }
  const res = await request<{ is_favorite: boolean; favorites_count: number }>(`/activities/${activityId}/favorite`);
  if (res.data) {
    return { data: { isFavorite: res.data.is_favorite ?? res.data.isFavorite, favoritesCount: res.data.favorites_count ?? res.data.favoritesCount } };
  }
  return { data: undefined, error: res.error };
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
  setCachedToken(null);
  return { data: undefined };
}

// --- Comments ---

function mapCommentFromApi(apiComment: ApiEventComment): EventComment {
  return {
    id: apiComment.id,
    eventId: apiComment.event_id,
    userId: apiComment.user_id,
    content: apiComment.content,
    phase: apiComment.phase as EventPhase,
    createdAt: apiComment.created_at,
    userName: apiComment.user_name,
    userAvatar: apiComment.user_avatar,
  };
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
  
  const result = await request<ApiEventComment[]>(url);
  if (result.data) {
    return { data: result.data.map(mapCommentFromApi) };
  }
  return { data: undefined, error: result.error };
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
  
  const result = await request<ApiEventComment>(`/events/${eventId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, phase }),
  });
  
  if (result.data) {
    return { data: mapCommentFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
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
    return { data: undefined, error: result.error };
  }
  return { data: undefined };
}

function mapActivityCommentFromApi(apiComment: ApiActivityComment): ActivityComment {
  return {
    id: apiComment.id,
    activityId: apiComment.activity_id || apiComment.activityId,
    userId: apiComment.user_id || apiComment.userId,
    content: apiComment.content,
    createdAt: apiComment.created_at || apiComment.createdAt,
    userName: apiComment.user_name || apiComment.userName,
    userAvatar: apiComment.user_avatar || apiComment.userAvatar,
  };
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
  
  const result = await request<ApiActivityComment[]>(`/activities/${activityId}/comments?skip=${skip}&limit=${limit}`);
  if (result.data) {
    return { data: result.data.map(mapActivityCommentFromApi) };
  }
  return { data: undefined, error: result.error };
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
  
  const result = await request<ApiActivityComment>(`/activities/${activityId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  
  if (result.data) {
    return { data: mapActivityCommentFromApi(result.data) };
  }
  return { data: undefined, error: result.error };
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
    return { data: undefined, error: result.error };
  }
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
  if (USE_MOCKS) {
    await delay(800);
    const event = events.find((e) => e.id === eventId);
    if (event) {
      event.inviteSentAt = event.inviteSentAt || new Date().toISOString();
      event.updatedAt = new Date().toISOString();
      return { data: { sent: event.participants.length || 0 } };
    }
    return { data: { sent: 0 }, error: { code: "NOT_FOUND", message: "Event nicht gefunden" } };
  }

  const result = await request<ApiSentCount>(`/ai/events/${eventId}/invites`, {
    method: "POST",
  });
  if (result.data) {
    return { data: { sent: result.data.sent ?? result.data.count ?? 0 } };
  }
  return { data: undefined, error: result.error };
}

export async function sendVotingReminder(eventId: string, userId?: string): Promise<ApiResult<{ sent: number }>> {
  if (USE_MOCKS) {
    await delay(600);
    const event = events.find((e) => e.id === eventId);
    if (event) {
      event.lastReminderAt = new Date().toISOString();
      const targetCount = userId ? 1 : (event.participants.filter((p) => !p.hasVoted).length || 0);
      return { data: { sent: targetCount } };
    }
    return { data: { sent: 0 }, error: { code: "NOT_FOUND", message: "Event nicht gefunden" } };
  }

  const body = userId ? { user_id: userId } : undefined;
  const result = await request<ApiSentCount>(`/ai/events/${eventId}/voting-reminders`, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (result.data) {
    return { data: { sent: result.data.sent ?? result.data.count ?? 0 } };
  }
  return { data: undefined, error: result.error };
}
