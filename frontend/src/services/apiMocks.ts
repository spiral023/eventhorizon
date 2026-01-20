import type { Activity, Event, Room, User } from "@/types/domain";

export type MockState = {
  rooms: Room[];
  activities: Activity[];
  favoriteCounts: Record<string, number>;
  events: Event[];
  favoriteActivityIds: string[];
  currentUser: User;
};

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
    slug: "masters-of-escape-team-raetselspass-in-linz",
    title: "Masters of Escape: Team-Rätselspaß in Linz",
    category: "action",
    tags: ["escape-game", "teambuilding", "puzzle"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Kaarstraße 9, 4040 Linz",
    estPricePerPerson: 28,
    priceComment: "Reine Spielgebühr ca. 25-30 € p.P. (je nach Teamgröße); bei mehreren Räumen gleichzeitig oft Rabatte auf Anfrage.",
    shortDescription: "Teamstärkende Rätsel, Spannung, Kooperation, unvergesslicher Spaß.",
    longDescription: "Adrenalin, Teamgeist und Rätselspaß: In dieser Escape Room Challenge wachst ihr als Team zusammen, kommuniziert besser und feiert gemeinsam den Erfolg.",
    imageUrl: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800&h=600&fit=crop",
    season: "all_year",
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

const mockEvents: Event[] = [
  {
    id: "event-1",
    shortCode: "B55-2EB-FF8",
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
  },
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

export const mockState: MockState = {
  rooms: mockRooms,
  activities: mockActivities,
  favoriteCounts: mockFavoriteCounts,
  events: mockEvents,
  favoriteActivityIds,
  currentUser,
};



