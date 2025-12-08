import type { Room, Activity } from "@/types/domain";

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
    estPricePerPerson: 35,
    shortDescription: "Rasantes Kartrennen auf professioneller Indoor-Bahn mit Zeitmessung und Siegerehrung.",
    imageUrl: "https://images.unsplash.com/photo-1504945005722-33670dcaf685?w=400&h=300&fit=crop",
    season: "all_year",
    riskLevel: "medium",
    duration: "2-3 Stunden",
    groupSizeMin: 6,
    groupSizeMax: 20,
  },
  {
    id: "act-2",
    title: "Kletterhalle",
    category: "action",
    tags: ["Sport", "Teamwork", "Indoor"],
    locationRegion: "WIE",
    estPricePerPerson: 25,
    shortDescription: "Gemeinsames Klettern mit professioneller Anleitung für alle Erfahrungsstufen.",
    imageUrl: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=400&h=300&fit=crop",
    season: "all_year",
    riskLevel: "medium",
    duration: "3-4 Stunden",
    groupSizeMin: 4,
    groupSizeMax: 15,
  },
  {
    id: "act-3",
    title: "Escape Room",
    category: "creative",
    tags: ["Rätsel", "Teamwork", "Indoor"],
    locationRegion: "SBG",
    estPricePerPerson: 28,
    shortDescription: "Knifflige Rätsel lösen und gemeinsam den Ausweg finden – perfekt fürs Teambuilding.",
    imageUrl: "https://images.unsplash.com/photo-1533372343425-4a7a1e2f56db?w=400&h=300&fit=crop",
    season: "all_year",
    riskLevel: "low",
    duration: "1-2 Stunden",
    groupSizeMin: 4,
    groupSizeMax: 8,
  },
  {
    id: "act-4",
    title: "Gemeinsames Kochen",
    category: "food",
    tags: ["Kulinarik", "Kreativ", "Indoor"],
    locationRegion: "WIE",
    estPricePerPerson: 65,
    shortDescription: "Kochkurs mit Profi-Koch – von der Vorspeise bis zum Dessert gemeinsam zaubern.",
    imageUrl: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop",
    season: "all_year",
    riskLevel: "low",
    duration: "4-5 Stunden",
    groupSizeMin: 8,
    groupSizeMax: 20,
  },
  {
    id: "act-5",
    title: "Hüttenabend",
    category: "relax",
    tags: ["Gemütlich", "Natur", "Outdoor"],
    locationRegion: "TIR",
    estPricePerPerson: 45,
    shortDescription: "Entspannter Abend auf einer urigen Almhütte mit regionalem Essen und Lagerfeuer.",
    imageUrl: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=400&h=300&fit=crop",
    season: "winter",
    riskLevel: "low",
    duration: "Übernachtung",
    groupSizeMin: 10,
    groupSizeMax: 30,
  },
  {
    id: "act-6",
    title: "Rafting Tour",
    category: "outdoor",
    tags: ["Abenteuer", "Wasser", "Natur"],
    locationRegion: "SBG",
    estPricePerPerson: 55,
    shortDescription: "Wildwasser-Rafting auf der Salzach – Adrenalin pur im Team!",
    imageUrl: "https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=400&h=300&fit=crop",
    season: "summer",
    riskLevel: "high",
    duration: "4-5 Stunden",
    groupSizeMin: 6,
    groupSizeMax: 24,
  },
  {
    id: "act-7",
    title: "Weinverkostung",
    category: "food",
    tags: ["Kulinarik", "Genuss", "Bildung"],
    locationRegion: "STMK",
    estPricePerPerson: 40,
    shortDescription: "Edle Tropfen probieren in einem traditionellen Weingut mit Kellerführung.",
    imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop",
    season: "autumn",
    riskLevel: "low",
    duration: "3-4 Stunden",
    groupSizeMin: 8,
    groupSizeMax: 25,
  },
  {
    id: "act-8",
    title: "Lasertag",
    category: "action",
    tags: ["Spaß", "Wettbewerb", "Indoor"],
    locationRegion: "NOE",
    estPricePerPerson: 22,
    shortDescription: "Actionreiches Lasertag-Match in futuristischer Arena – Team gegen Team!",
    imageUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=300&fit=crop",
    season: "all_year",
    riskLevel: "low",
    duration: "2-3 Stunden",
    groupSizeMin: 8,
    groupSizeMax: 30,
  },
];

// ============================================
// API FUNCTIONS
// ============================================

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getRooms(): Promise<ApiResult<Room[]>> {
  await delay(300); // Simulate network delay
  return { data: mockRooms };
}

export async function getActivities(): Promise<ApiResult<Activity[]>> {
  await delay(400);
  return { data: mockActivities };
}

export async function getRoomById(id: string): Promise<ApiResult<Room | null>> {
  await delay(200);
  const room = mockRooms.find((r) => r.id === id) || null;
  return { data: room };
}

export async function getActivityById(id: string): Promise<ApiResult<Activity | null>> {
  await delay(200);
  const activity = mockActivities.find((a) => a.id === id) || null;
  return { data: activity };
}
