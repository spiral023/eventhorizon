import type { ApiResult } from "@/types/api";
import type {
  Activity,
  ActivityComment,
  BudgetType,
  Company,
  DateResponseType,
  Event,
  EventComment,
  EventPhase,
  EventTimeWindow,
  Room,
  User,
  UserStats,
  VoteType,
} from "@/types/domain";
import type { CreateEventInput } from "@/schemas";
import type {
  AiRecommendation,
  AvatarUploadInfo,
  BookingRequestInput,
  RoomMember,
  SearchResult,
  TeamPreferenceSummary,
} from "./types";
import { trackFavoriteToggle } from "@/lib/metrics";
import { mockState } from "../apiMocks";
import { delay } from "./core";

let isLoggedIn = true;

const generateInviteCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const generatePart = () => Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${generatePart()}-${generatePart()}-${generatePart()}`;
};

const findRoom = (accessCode: string): Room | undefined =>
  mockState.rooms.find((r) => r.inviteCode === accessCode || r.id === accessCode);

const findEvent = (eventCode: string): Event | undefined =>
  mockState.events.find((e) => e.id === eventCode || e.shortCode === eventCode);

export async function login(email: string, password: string): Promise<ApiResult<User>> {
  await delay(500);
  isLoggedIn = true;
  return { data: mockState.currentUser };
}

export async function register(user: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}): Promise<ApiResult<{ email: string }>> {
  await delay(200);
  isLoggedIn = true;
  return { data: { email: user.email } };
}

export async function logout(): Promise<ApiResult<void>> {
  await delay(200);
  isLoggedIn = false;
  return { data: undefined };
}

export async function getCurrentUser(): Promise<ApiResult<User | null>> {
  await delay(100);
  return { data: isLoggedIn ? mockState.currentUser : null };
}

export async function getCompanies(): Promise<ApiResult<Company[]>> {
  await delay(200);
  return { data: mockState.companies as Company[] };
}

export async function getCompany(companyId: number): Promise<ApiResult<Company | null>> {
  await delay(150);
  const company = mockState.companies.find((c) => c.id === companyId) || null;
  return { data: company as Company | null };
}

export async function updateUser(updates: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyId?: number | null;
  department?: string;
  position?: string;
  location?: string;
  birthday?: string;
  bio?: string;
  hobbies?: string[];
  activityPreferences?: unknown;
  dietaryRestrictions?: string[];
  allergies?: string[];
  avatarUrl?: string;
}): Promise<ApiResult<User | null>> {
  await delay(200);
  if (!isLoggedIn) {
    return { data: null, error: { code: "UNAUTHORIZED", message: "Nicht angemeldet" } };
  }

  Object.assign(mockState.currentUser, updates);
  if (updates.firstName || updates.lastName) {
    mockState.currentUser.firstName = updates.firstName || mockState.currentUser.firstName;
    mockState.currentUser.lastName = updates.lastName || mockState.currentUser.lastName;
    mockState.currentUser.name = `${mockState.currentUser.firstName} ${mockState.currentUser.lastName}`.trim();
  }
  return { data: mockState.currentUser };
}

export async function getAvatarUploadUrl(contentType: string, fileSize: number): Promise<ApiResult<AvatarUploadInfo>> {
  await delay(50);
  return {
    data: {
      uploadUrl: "https://example.com/mock-upload",
      publicUrl: `https://picsum.photos/seed/${Date.now()}/200`,
      uploadKey: "avatars/mock-user/orig.png",
    },
  };
}

export async function processAvatarUpload(
  uploadKey: string,
  outputFormat: "webp" | "avif" | "jpeg" | "jpg" | "png" | undefined = "webp"
): Promise<ApiResult<User | null>> {
  await delay(80);
  mockState.currentUser.avatarUrl = `https://picsum.photos/seed/${Date.now()}/128`;
  return { data: mockState.currentUser };
}

export async function uploadAvatar(file: File): Promise<ApiResult<User | null>> {
  await delay(120);
  mockState.currentUser.avatarUrl = `https://picsum.photos/seed/${Date.now()}/128`;
  return { data: mockState.currentUser };
}

export async function getUserStats(): Promise<ApiResult<UserStats>> {
  await delay(200);
  return {
    data: {
      upcomingEventsCount: 2,
      openVotesCount: 3,
    },
  };
}

export async function getUserEvents(): Promise<ApiResult<Event[]>> {
  await delay(300);
  return { data: mockState.events };
}

export async function getActivities(roomId?: string): Promise<ApiResult<Activity[]>> {
  await delay(400);
  return { data: mockState.activities };
}

export async function getActivityById(id: string): Promise<ApiResult<Activity | null>> {
  await delay(200);
  const activity = mockState.activities.find((a) => a.id === id) || null;
  return { data: activity };
}

export async function getRooms(): Promise<ApiResult<Room[]>> {
  await delay(300);
  return { data: mockState.rooms };
}

export async function getRoomByAccessCode(accessCode: string): Promise<ApiResult<Room | null>> {
  await delay(200);
  const room = findRoom(accessCode) || null;
  return { data: room };
}

export async function updateRoom(
  accessCode: string,
  updates: { name?: string; description?: string; avatarUrl?: string }
): Promise<ApiResult<Room | null>> {
  await delay(250);
  const idx = mockState.rooms.findIndex((r) => r.inviteCode === accessCode || r.id === accessCode);
  if (idx === -1) return { data: null, error: { code: "NOT_FOUND", message: "Raum nicht gefunden" } };
  mockState.rooms[idx] = { ...mockState.rooms[idx], ...updates };
  return { data: mockState.rooms[idx] };
}

export async function getRoomAvatarUploadUrl(
  accessCode: string,
  contentType: string,
  fileSize: number
): Promise<ApiResult<AvatarUploadInfo>> {
  await delay(80);
  return {
    data: {
      uploadUrl: "https://example.com/mock-upload",
      publicUrl: `https://picsum.photos/seed/room-${accessCode}/256`,
      uploadKey: `rooms/${accessCode}/orig.png`,
    },
  };
}

export async function processRoomAvatar(
  accessCode: string,
  uploadKey: string,
  outputFormat: "webp" | "avif" | "jpeg" | "jpg" | "png" | undefined = "webp"
): Promise<ApiResult<Room | null>> {
  await delay(120);
  const url = `https://picsum.photos/seed/room-${accessCode}-${Date.now()}/256`;
  const idx = mockState.rooms.findIndex((r) => r.inviteCode === accessCode || r.id === accessCode);
  if (idx !== -1) mockState.rooms[idx].avatarUrl = url;
  return { data: idx !== -1 ? mockState.rooms[idx] : null };
}

export async function uploadRoomAvatar(accessCode: string, file: File): Promise<ApiResult<Room | null>> {
  await delay(120);
  const url = `https://picsum.photos/seed/room-${accessCode}-${Date.now()}/256`;
  const idx = mockState.rooms.findIndex((r) => r.inviteCode === accessCode || r.id === accessCode);
  if (idx !== -1) mockState.rooms[idx].avatarUrl = url;
  return { data: idx !== -1 ? mockState.rooms[idx] : null };
}

export async function createRoom(input: { name: string; description?: string }): Promise<ApiResult<Room>> {
  await delay(400);
  const newRoom: Room = {
    id: `room-${Date.now()}`,
    name: input.name,
    description: input.description,
    inviteCode: generateInviteCode(),
    memberCount: 1,
    createdAt: new Date().toISOString(),
    createdByUserId: mockState.currentUser.id,
    avatarUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&h=100&fit=crop",
  };
  mockState.rooms.push(newRoom);
  return { data: newRoom };
}

export async function deleteRoom(accessCode: string): Promise<ApiResult<void>> {
  await delay(300);
  const index = mockState.rooms.findIndex((r) => r.inviteCode === accessCode || r.id === accessCode);
  if (index === -1) {
    return {
      data: undefined,
      error: { code: "NOT_FOUND", message: "Raum nicht gefunden" },
    };
  }
  const room = mockState.rooms[index];
  mockState.rooms.splice(index, 1);
  mockState.events = mockState.events.filter((e) => e.roomId !== accessCode && e.roomId !== room.id);
  return { data: undefined };
}

export async function joinRoom(inviteCode: string): Promise<ApiResult<Room>> {
  await delay(400);
  const room = mockState.rooms.find((r) => r.inviteCode === inviteCode);
  if (!room) {
    return {
      data: undefined,
      error: { code: "NOT_FOUND", message: "Raum mit diesem Code nicht gefunden" },
    };
  }
  room.memberCount += 1;
  return { data: room };
}

export async function leaveRoom(accessCode: string): Promise<ApiResult<void>> {
  await delay(300);
  const room = mockState.rooms.find((r) => r.inviteCode === accessCode || r.id === accessCode);
  if (!room) {
    return {
      data: undefined,
      error: { code: "NOT_FOUND", message: "Raum nicht gefunden" },
    };
  }
  if (room.createdByUserId === mockState.currentUser.id) {
    return {
      data: undefined,
      error: { code: "FORBIDDEN", message: "Der Raumersteller kann den Raum nicht verlassen" },
    };
  }

  const memberIdx = room.members?.findIndex((m) => m.userId === mockState.currentUser.id) ?? -1;
  if (memberIdx === -1) {
    return {
      data: undefined,
      error: { code: "BAD_REQUEST", message: "Du bist kein Mitglied dieses Raums" },
    };
  }

  room.members?.splice(memberIdx, 1);
  room.memberCount = Math.max(0, room.memberCount - 1);

  return { data: undefined };
}

export async function getRoomMembers(accessCode: string): Promise<ApiResult<RoomMember[]>> {
  await delay(200);
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

export async function getEventsByAccessCode(accessCode: string): Promise<ApiResult<Event[]>> {
  await delay(300);
  const targetRoom = findRoom(accessCode);
  const targetId = targetRoom?.id ?? accessCode;
  const roomEvents = mockState.events.filter((e) => e.roomId === targetId);
  return { data: roomEvents };
}

export async function getEventByCode(eventCode: string): Promise<ApiResult<Event | null>> {
  await delay(200);
  const event = findEvent(eventCode) || null;
  return { data: event };
}

export async function deleteEvent(eventCode: string): Promise<ApiResult<void>> {
  await delay(200);
  const index = mockState.events.findIndex((e) => e.id === eventCode || e.shortCode === eventCode);
  if (index === -1) {
    return {
      data: undefined,
      error: { code: "NOT_FOUND", message: "Event nicht gefunden" },
    };
  }
  const event = mockState.events[index];
  if (event.createdByUserId !== mockState.currentUser.id) {
    return {
      data: undefined,
      error: { code: "FORBIDDEN", message: "Nur der Ersteller kann das Event löschen" },
    };
  }
  mockState.events.splice(index, 1);
  return { data: undefined };
}

export async function createEvent(
  accessCode: string,
  input: CreateEventInput & { timeWindow: EventTimeWindow }
): Promise<ApiResult<Event>> {
  await delay(400);
  const targetRoom = findRoom(accessCode);
  const roomKey = targetRoom?.id ?? accessCode;
  const newEvent: Event = {
    id: `event-${Date.now()}`,
    shortCode: generateInviteCode(),
    roomId: roomKey,
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
      { userId: mockState.currentUser.id, userName: mockState.currentUser.name, isOrganizer: true, hasVoted: false },
    ],
    createdAt: new Date().toISOString(),
    createdByUserId: mockState.currentUser.id,
  };
  mockState.events.push(newEvent);
  return { data: newEvent };
}

export async function updateEvent(
  eventCode: string,
  updates: {
    name?: string;
    description?: string;
    budgetType?: BudgetType;
    budgetAmount?: number;
    avatarUrl?: string;
    inviteSentAt?: string;
    lastReminderAt?: string;
    unreadMessageCount?: number;
  }
): Promise<ApiResult<Event | null>> {
  await delay(200);
  const event = findEvent(eventCode);
  if (!event) {
    return { data: null, error: { code: "NOT_FOUND", message: "Event nicht gefunden" } };
  }
  if (event.createdByUserId !== mockState.currentUser.id) {
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

export async function getEventAvatarUploadUrl(
  eventCode: string,
  contentType: string,
  fileSize: number
): Promise<ApiResult<AvatarUploadInfo>> {
  await delay(50);
  return {
    data: {
      uploadUrl: "https://example.com/mock-upload",
      publicUrl: `https://picsum.photos/seed/event-${eventCode}-${Date.now()}/400`,
      uploadKey: `events/mock/${eventCode}/orig.png`,
    },
  };
}

export async function processEventAvatar(
  eventCode: string,
  uploadKey: string,
  outputFormat: "webp" | "avif" | "jpeg" | "jpg" | "png" | undefined = "webp"
): Promise<ApiResult<Event | null>> {
  await delay(120);
  const url = `https://picsum.photos/seed/event-${eventCode}-${Date.now()}/400/240`;
  const event = findEvent(eventCode);
  if (event) {
    event.avatarUrl = url;
    event.updatedAt = new Date().toISOString();
    return { data: event };
  }
  return { data: null, error: { code: "NOT_FOUND", message: "Event nicht gefunden" } };
}

export async function uploadEventAvatar(eventCode: string, file: File): Promise<ApiResult<Event | null>> {
  await delay(120);
  const url = `https://picsum.photos/seed/event-${eventCode}-${Date.now()}/400/240`;
  const event = findEvent(eventCode);
  if (event) {
    event.avatarUrl = url;
    event.updatedAt = new Date().toISOString();
    return { data: event };
  }
  return { data: null, error: { code: "NOT_FOUND", message: "Event nicht gefunden" } };
}

export async function updateEventPhase(eventCode: string, newPhase: EventPhase): Promise<ApiResult<Event | null>> {
  await delay(200);
  const event = findEvent(eventCode);
  if (event) {
    event.phase = newPhase;
    event.updatedAt = new Date().toISOString();
    return { data: event };
  }
  return { data: null };
}

export async function removeProposedActivity(eventCode: string, activityId: string): Promise<ApiResult<Event | null>> {
  await delay(150);
  const event = findEvent(eventCode);
  if (!event) return { data: undefined, error: { code: "NOT_FOUND", message: "Event nicht gefunden" } };

  if (event.createdByUserId !== mockState.currentUser.id) {
    return { data: undefined, error: { code: "FORBIDDEN", message: "Nur der Ersteller kann Vorschläge entfernen" } };
  }

  event.proposedActivityIds = event.proposedActivityIds.filter((id) => id !== activityId);
  event.activityVotes = event.activityVotes.filter((v) => v.activityId !== activityId);
  event.excludedActivityIds = event.excludedActivityIds?.filter((id) => id !== activityId) || [];
  return { data: event };
}

export async function excludeActivity(eventCode: string, activityId: string): Promise<ApiResult<Event | null>> {
  await delay(150);
  const event = findEvent(eventCode);
  if (!event) return { data: undefined, error: { code: "NOT_FOUND", message: "Event nicht gefunden" } };

  if (event.createdByUserId !== mockState.currentUser.id) {
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

export async function includeActivity(eventCode: string, activityId: string): Promise<ApiResult<Event | null>> {
  await delay(150);
  const event = findEvent(eventCode);
  if (!event) return { data: undefined, error: { code: "NOT_FOUND", message: "Event nicht gefunden" } };

  if (event.createdByUserId !== mockState.currentUser.id) {
    return { data: undefined, error: { code: "FORBIDDEN", message: "Nur der Ersteller kann Aktivitäten wieder aufnehmen" } };
  }

  if (event.excludedActivityIds) {
    event.excludedActivityIds = event.excludedActivityIds.filter((id) => id !== activityId);
  }
  event.updatedAt = new Date().toISOString();
  return { data: event };
}

export async function voteOnActivity(
  eventCode: string,
  activityId: string,
  vote: VoteType
): Promise<ApiResult<Event | null>> {
  await delay(200);
  const event = findEvent(eventCode);
  if (event) {
    let activityVote = event.activityVotes.find((av) => av.activityId === activityId);
    if (!activityVote) {
      activityVote = { activityId, votes: [] };
      event.activityVotes.push(activityVote);
    }
    activityVote.votes = activityVote.votes.filter((v) => v.userId !== mockState.currentUser.id);
    activityVote.votes.push({
      userId: mockState.currentUser.id,
      userName: mockState.currentUser.name,
      vote,
      votedAt: new Date().toISOString(),
    });
    return { data: event };
  }
  return { data: null };
}

export async function addDateOption(
  eventCode: string,
  date: string,
  startTime?: string,
  endTime?: string
): Promise<ApiResult<Event | null>> {
  await delay(200);
  const event = findEvent(eventCode);
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

export async function deleteDateOption(eventCode: string, dateOptionId: string): Promise<ApiResult<Event | null>> {
  await delay(200);
  const event = findEvent(eventCode);
  if (event) {
    event.dateOptions = event.dateOptions.filter((d) => d.id !== dateOptionId);
    return { data: event };
  }
  return { data: null };
}

export async function respondToDateOption(
  eventCode: string,
  dateOptionId: string,
  response: DateResponseType,
  isPriority = false,
  contribution?: number
): Promise<ApiResult<Event | null>> {
  await delay(200);
  const event = findEvent(eventCode);
  if (event) {
    const dateOption = event.dateOptions.find((d) => d.id === dateOptionId);
    if (dateOption) {
      if (isPriority) {
        event.dateOptions.forEach((d) => {
          const resp = d.responses.find((r) => r.userId === mockState.currentUser.id);
          if (resp) resp.isPriority = false;
        });
      }

      dateOption.responses = dateOption.responses.filter((r) => r.userId !== mockState.currentUser.id);
      dateOption.responses.push({
        userId: mockState.currentUser.id,
        userName: mockState.currentUser.name,
        response,
        isPriority,
        contribution,
      });
    }
    return { data: event };
  }
  return { data: null };
}

export async function selectWinningActivity(eventCode: string, activityId: string): Promise<ApiResult<Event | null>> {
  await delay(200);
  const event = findEvent(eventCode);
  if (event) {
    event.chosenActivityId = activityId;
    event.phase = "scheduling";
    return { data: event };
  }
  return { data: null };
}

export async function finalizeDateOption(eventCode: string, dateOptionId: string): Promise<ApiResult<Event | null>> {
  await delay(200);
  const event = findEvent(eventCode);
  if (event) {
    event.finalDateOptionId = dateOptionId;
    event.phase = "info";
    return { data: event };
  }
  return { data: null };
}

export async function getFavoriteActivityIds(): Promise<ApiResult<string[]>> {
  await delay(100);
  return { data: mockState.favoriteActivityIds };
}

export async function toggleFavorite(
  activityId: string
): Promise<ApiResult<{ isFavorite: boolean; favoritesCount: number }>> {
  await delay(150);
  const index = mockState.favoriteActivityIds.indexOf(activityId);
  let updatedCount = mockState.favoriteCounts[activityId] || 0;
  if (index > -1) {
    mockState.favoriteActivityIds.splice(index, 1);
    mockState.favoriteCounts[activityId] = Math.max((mockState.favoriteCounts[activityId] || 1) - 1, 0);
    updatedCount = mockState.favoriteCounts[activityId] || 0;
    const activity = mockState.activities.find((a) => a.id === activityId);
    if (activity) activity.favoritesCount = updatedCount;
    const data = { isFavorite: false, favoritesCount: updatedCount };
    trackFavoriteToggle(data.isFavorite);
    return { data };
  }
  mockState.favoriteActivityIds.push(activityId);
  mockState.favoriteCounts[activityId] = (mockState.favoriteCounts[activityId] || 0) + 1;
  updatedCount = mockState.favoriteCounts[activityId];
  const activity = mockState.activities.find((a) => a.id === activityId);
  if (activity) activity.favoritesCount = updatedCount;
  const data = { isFavorite: true, favoritesCount: updatedCount };
  trackFavoriteToggle(data.isFavorite);
  return { data };
}

export async function isFavorite(
  activityId: string
): Promise<ApiResult<{ isFavorite: boolean; favoritesCount: number }>> {
  await delay(50);
  return {
    data: {
      isFavorite: mockState.favoriteActivityIds.includes(activityId),
      favoritesCount: mockState.favoriteCounts[activityId] || 0,
    },
  };
}

export async function getEventComments(
  eventCode: string,
  phase?: EventPhase,
  skip = 0,
  limit = 50
): Promise<ApiResult<EventComment[]>> {
  await delay(300);
  const mockComments: EventComment[] = [
    {
      id: "c1",
      eventId: eventCode,
      userId: "u2",
      content: "Super Idee!",
      phase: "proposal",
      createdAt: new Date().toISOString(),
      userName: "Anna",
      userAvatar: "",
    },
    {
      id: "c2",
      eventId: eventCode,
      userId: "u3",
      content: "Bin dabei.",
      phase: "voting",
      createdAt: new Date().toISOString(),
      userName: "Tom",
      userAvatar: "",
    },
  ].filter((c) => !phase || c.phase === phase);
  return { data: mockComments };
}

export async function createEventComment(
  eventCode: string,
  content: string,
  phase: EventPhase
): Promise<ApiResult<EventComment>> {
  await delay(300);
  return {
    data: {
      id: `c-${Date.now()}`,
      eventId: eventCode,
      userId: mockState.currentUser.id,
      content,
      phase,
      createdAt: new Date().toISOString(),
      userName: mockState.currentUser.name,
      userAvatar: mockState.currentUser.avatarUrl,
    },
  };
}

export async function deleteEventComment(eventCode: string, commentId: string): Promise<ApiResult<void>> {
  await delay(150);
  return { data: undefined };
}

export async function getActivityComments(activityId: string, skip = 0, limit = 50): Promise<ApiResult<ActivityComment[]>> {
  await delay(300);
  const mockComments: ActivityComment[] = [
    {
      id: "ac1",
      activityId,
      userId: "u2",
      content: "War letztes Jahr super!",
      createdAt: new Date(Date.now() - 100000000).toISOString(),
      userName: "Anna",
      userAvatar: "",
    },
    {
      id: "ac2",
      activityId,
      userId: "u3",
      content: "Kann ich empfehlen.",
      createdAt: new Date().toISOString(),
      userName: "Tom",
      userAvatar: "",
    },
  ];
  return { data: mockComments };
}

export async function createActivityComment(activityId: string, content: string): Promise<ApiResult<ActivityComment>> {
  await delay(300);
  return {
    data: {
      id: `ac-${Date.now()}`,
      activityId,
      userId: mockState.currentUser.id,
      content,
      createdAt: new Date().toISOString(),
      userName: mockState.currentUser.name,
      userAvatar: mockState.currentUser.avatarUrl,
    },
  };
}

export async function deleteActivityComment(activityId: string, commentId: string): Promise<ApiResult<void>> {
  await delay(150);
  return { data: undefined };
}

export async function getTeamRecommendations(roomId: string): Promise<ApiResult<TeamPreferenceSummary>> {
  await delay(600);
  const summary: TeamPreferenceSummary = {
    categoryDistribution: [
      { category: "action", percentage: 40, count: 5 },
      { category: "food", percentage: 30, count: 3 },
      { category: "relax", percentage: 20, count: 2 },
      { category: "party", percentage: 10, count: 1 },
    ],
    preferredGoals: ["teambuilding", "fun"],
    recommendedActivityIds: ["act-1"],
    teamVibe: "action",
    insights: ["Euer Team bevorzugt aktive Erlebnisse mit Wettbewerbscharakter."],
    memberCount: 8,
    socialVibe: "medium",
    synergyScore: 85,
    teamPersonality: "Die Action-Helden",
    strengths: ["Schnelle Entscheidungen"],
    challenges: ["Ruhige Momente"],
    teamPreferences: {
      physical: 4.1,
      mental: 2.9,
      social: 3.6,
      competition: 3.2,
    },
    favoritesParticipation: {
      count: 7,
      total: 8,
      percentage: 87.5,
    },
    preferencesCoverage: {
      count: 6,
      total: 8,
      percentage: 75,
    },
  };
  return { data: summary };
}

export async function getActivitySuggestionsForEvent(eventCode: string): Promise<ApiResult<AiRecommendation[]>> {
  await delay(500);
  return { data: [] };
}

export async function sendEventInvites(eventCode: string): Promise<ApiResult<{ sent: number }>> {
  const event = findEvent(eventCode);
  await delay(800);
  if (event) {
    event.inviteSentAt = event.inviteSentAt || new Date().toISOString();
    event.updatedAt = new Date().toISOString();
    return { data: { sent: event.participants.length || 0 } };
  }
  return { data: { sent: 0 }, error: { code: "NOT_FOUND", message: "Event nicht gefunden" } };
}

export async function sendVotingReminder(eventCode: string, userId?: string): Promise<ApiResult<{ sent: number }>> {
  const event = findEvent(eventCode);
  await delay(600);
  if (event) {
    event.lastReminderAt = new Date().toISOString();
    const targetCount = userId ? 1 : event.participants.filter((p) => !p.hasVoted).length || 0;
    return { data: { sent: targetCount } };
  }
  return { data: { sent: 0 }, error: { code: "NOT_FOUND", message: "Event nicht gefunden" } };
}

export async function sendBookingRequest(
  activityId: string,
  requestData: BookingRequestInput
): Promise<ApiResult<void>> {
  await delay(800);
  return { data: undefined };
}

export async function searchGlobal(query: string): Promise<ApiResult<SearchResult>> {
  const events = mockState.events;
  await delay(300);
  const q = query.toLowerCase();
  return {
    data: {
      activities: mockState.activities.filter((a) => a.title.toLowerCase().includes(q)).map((a) => ({ ...a })),
      rooms: mockState.rooms.filter((r) => r.name.toLowerCase().includes(q)),
      events: events.filter((e) => e.name.toLowerCase().includes(q)),
      users: [],
    },
  };
}
