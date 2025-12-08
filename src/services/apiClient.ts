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
  // ============ OOE Activities ============ 
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
  {
    id: "act-2",
    title: "Lasertron: Actionreiches Lasertag Battle",
    category: "action",
    tags: ["lasertag", "action", "teambuilding", "indoor"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Prinz-Eugen-Straße 22, 4020 Linz",
    estPricePerPerson: 22,
    priceComment: "Pakete (z.B. 3 Spiele + Getränk) liegen bei ca. 22 €; Exklusivmiete der Arena für Firmenfeiern möglich.",
    shortDescription: "Actionreicher Lasertag-Spaß für Teams mit Strategie, Adrenalin und viel Bewegung.",
    longDescription: "In der futuristischen Lasertag-Arena tretet ihr in Teams gegeneinander an, trainiert Taktik, Reaktion und Kommunikation – perfekt, um Kolleg:innen spielerisch zusammenzuschweißen.",
    imageUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "medium",
    typicalDurationHours: 3.5,
    recommendedGroupSizeMin: 8,
    recommendedGroupSizeMax: 30,
    physicalIntensity: 5,
    mentalChallenge: 2,
    socialInteractionLevel: 3,
    competitionLevel: 4,
    weatherDependent: false,
    externalRating: 4.3,
    travelTimeMinutes: 5,
    travelTimeMinutesWalking: 17,
    primaryGoal: "teambuilding",
    provider: "Lasertron Linz",
    website: "https://lasertron-linz.at/",
    contactPhone: "0732946227",
    contactEmail: "info@lasertron-linz.at",
    coordinates: [48.2974, 14.3005],
  },
  {
    id: "act-3",
    title: "Exit the Room: Das Escape Abenteuer Linz",
    category: "action",
    tags: ["escape-room", "rätsel", "teambuilding", "indoor"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Auerspergstraße 15, 4020 Linz",
    estPricePerPerson: 28,
    priceComment: "Preis sinkt bei voller Belegung (6 Pers.) auf ca. 22 € p.P.; reine Spielkosten, keine Gastronomie vor Ort.",
    shortDescription: "Klassische Escape Rooms mit kniffligen Rätseln und 60 Minuten Zeitdruck.",
    longDescription: "Ihr werdet gemeinsam in einen Themenraum 'eingesperrt' und müsst innerhalb von 60 Minuten Codes knacken, Hinweise kombinieren und als Team den Ausweg finden – ideal für kleine Gruppen, die Grübelspaß lieben.",
    imageUrl: "https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 2,
    recommendedGroupSizeMin: 4,
    recommendedGroupSizeMax: 6,
    physicalIntensity: 2,
    mentalChallenge: 5,
    socialInteractionLevel: 5,
    competitionLevel: 1,
    weatherDependent: false,
    externalRating: 4.7,
    travelTimeMinutes: 5,
    travelTimeMinutesWalking: 21,
    primaryGoal: "teambuilding",
    provider: "Exit the Room Linz",
    website: "https://www.exittheroom.at/escape-room-linz",
    contactPhone: "06606844996",
    contactEmail: "linz@exittheroom.at",
    coordinates: [48.2995, 14.2925],
  },
  {
    id: "act-4",
    title: "NoWayOut: Premium Escape Room Erlebnis",
    category: "action",
    tags: ["escape-room", "horror", "rätsel", "teambuilding"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Prinz-Eugen-Straße 22, 4020 Linz",
    estPricePerPerson: 30,
    priceComment: "Premium-Räume liegen bei ca. 30–35 € p.P.; spezielle Firmen-Challenge-Modi für große Gruppen buchbar.",
    shortDescription: "Filmreife Escape-Abenteuer mit starken Storys und viel Adrenalin.",
    longDescription: "Aufwendig gestaltete Themenräume sorgen für Gänsehaut, Spannung und Teamwork – von magischen bis schaurigen Szenarien arbeitet ihr euch gemeinsam durch Rätsel, Effekte und Überraschungen.",
    imageUrl: "https://images.unsplash.com/photo-1462899006636-339e08d1844e?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 3.5,
    recommendedGroupSizeMin: 8,
    recommendedGroupSizeMax: 15,
    physicalIntensity: 2,
    mentalChallenge: 5,
    socialInteractionLevel: 5,
    competitionLevel: 1,
    weatherDependent: false,
    externalRating: 4.4,
    travelTimeMinutes: 5,
    travelTimeMinutesWalking: 17,
    primaryGoal: "teambuilding",
    provider: "NoWayOut Linz",
    website: "https://linz.nowayout-escape.at/de/",
    contactPhone: "0732946227",
    contactEmail: "linz@nowayout-escape.at",
    coordinates: [48.2974, 14.3005],
  },
  {
    id: "act-5",
    title: "Ocean Park: Bowling & Dinner Teamevent",
    category: "action",
    tags: ["bowling", "essen", "trinken", "fun", "indoor", "teambuilding"],
    locationRegion: "OOE",
    locationCity: "Pasching",
    locationAddress: "Plus-Kauf-Straße 7, 4061 Pasching",
    estPricePerPerson: 35,
    priceComment: "Reine Bahnmiete ist günstig (geteilt durch Spieler); beliebtes \"Eat & Bowl\"-Paket (Burger + Bowling) liegt bei ca. 30–40 € p.P.",
    shortDescription: "Bowling, Games und Gastronomie im großen Family-Entertainment-Center.",
    longDescription: "Zwischen Bowlingbahnen, Billard und Arcade-Games stärkt ihr euch mit Drinks und Speisen – lockere Atmosphäre für entspannte Firmenfeiern, Afterwork-Events und größere Gruppen.",
    imageUrl: "https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 3.5,
    recommendedGroupSizeMin: 8,
    recommendedGroupSizeMax: 30,
    physicalIntensity: 3,
    mentalChallenge: 2,
    socialInteractionLevel: 4,
    competitionLevel: 3,
    weatherDependent: false,
    externalRating: 3.5,
    travelTimeMinutes: 14,
    travelTimeMinutesWalking: 125,
    primaryGoal: "teambuilding",
    provider: "Ocean Park GmbH",
    website: "https://oceanparkpluscity.at/",
    contactPhone: "0722962222",
    contactEmail: "linz@oceanpark.at",
    coordinates: [48.2435, 14.2385],
  },
  {
    id: "act-6",
    title: "JUMP DOME Linz: Trampolin-Action pur",
    category: "action",
    tags: ["trampolinpark", "action", "sport", "teambuilding", "indoor"],
    locationRegion: "OOE",
    locationCity: "Leonding",
    locationAddress: "Im Bäckerfeld 1, 4060 Leonding",
    estPricePerPerson: 24,
    priceComment: "Business-Pakete (Eintritt, Socken, Getränk, Snack) starten ab ca. 24 €; Catering für danach zubuchbar.",
    shortDescription: "Großer Trampolin- und Funpark für körperliche Action und Auspowern im Team.",
    longDescription: "Auf zahlreichen Trampolinen, Parcours und Sprungelementen könnt ihr euch so richtig austoben, gemeinsam Challenges meistern und spielerisch Teamgeist, Balance und Mut trainieren.",
    imageUrl: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "high",
    typicalDurationHours: 3,
    recommendedGroupSizeMin: 8,
    recommendedGroupSizeMax: 30,
    physicalIntensity: 5,
    mentalChallenge: 1,
    socialInteractionLevel: 3,
    competitionLevel: 2,
    weatherDependent: false,
    externalRating: 4.6,
    travelTimeMinutes: 13,
    travelTimeMinutesWalking: 110,
    primaryGoal: "teambuilding",
    provider: "JUMP DOME Linz GmbH",
    website: "https://jumpdome.at/linz/",
    contactPhone: "0732600600",
    contactEmail: "linz@jumpdome.at",
    coordinates: [48.2605, 14.2498],
  },
  {
    id: "act-7",
    title: "Linzer Bier: Brauereiführung & Verkostung",
    category: "food",
    tags: ["führung", "brauerei", "bier", "genuss", "teambuilding", "kultur"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Peter-Behrens-Platz 1, 4020 Linz",
    estPricePerPerson: 19,
    priceComment: "Basis-Führung inkl. Kostprobe ca. 16–19 €; mit ausgiebiger Jause/Verkostung eher 25–30 € p.P.",
    shortDescription: "Geführter Rundgang durch die Linzer Brauerei mit Blick hinter die Kulissen und Verkostung.",
    longDescription: "Ihr taucht in die Geschichte des Linzer Biers und der Tabakfabrik ein, lernt den Brauprozess kennen und schließt die Tour mit einer gemütlichen Bierverkostung – perfekt für genussorientierte Teams.",
    imageUrl: "https://images.unsplash.com/photo-1559526324-593bc073d938?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 2.5,
    minParticipants: 8,
    recommendedGroupSizeMin: 8,
    recommendedGroupSizeMax: 25,
    physicalIntensity: 2,
    mentalChallenge: 1,
    socialInteractionLevel: 3,
    competitionLevel: 1,
    weatherDependent: false,
    externalRating: 4.3,
    travelTimeMinutes: 5,
    travelTimeMinutesWalking: 26,
    primaryGoal: "fun",
    provider: "Linzer Bierbrauerei",
    website: "https://www.linzerbier.at/fuehrungen/",
    contactPhone: "0732797800",
    contactEmail: "office@linzerbier.at",
    coordinates: [48.3090, 14.3045],
  },
  {
    id: "act-8",
    title: "Ruff Indoor Golf: Die Team-Challenge Linz",
    category: "action",
    tags: ["indoor-golf", "sport", "fun", "teambuilding"],
    locationRegion: "OOE",
    locationCity: "Leonding",
    locationAddress: "Im Bäckerfeld 1/Parkhaus 2. OG, 4060 Leonding",
    estPricePerPerson: 25,
    priceComment: "Box-Miete wird durch Spieler geteilt (günstig); Event-Pakete inkl. Drinks & Snacks starten meist ab 25 € p.P.",
    shortDescription: "Modernes Indoor-Golf mit Simulatoren für Anfänger:innen und Pros.",
    longDescription: "In Lounge-Atmosphäre spielt ihr virtuelle Golfplätze rund um den Globus, probiert unterschiedliche Challenges aus und könnt euch bei Drinks in Ruhe austauschen – ein lockeres, wetterunabhängiges Teamevent.",
    imageUrl: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 3,
    recommendedGroupSizeMin: 4,
    recommendedGroupSizeMax: 20,
    physicalIntensity: 3,
    mentalChallenge: 1,
    socialInteractionLevel: 3,
    competitionLevel: 2,
    weatherDependent: false,
    externalRating: 4.8,
    travelTimeMinutes: 14,
    travelTimeMinutesWalking: 105,
    primaryGoal: "teambuilding",
    provider: "RUFF Indoor Golf",
    website: "https://ruffgolf.eu/at/",
    contactPhone: "06764600234",
    contactEmail: "linz@ruffgolf.at",
    coordinates: [48.2605, 14.2498],
  },
  {
    id: "act-9",
    title: "Another World: VR Team-Abenteuer erleben",
    category: "action",
    tags: ["virtual-reality", "gaming", "action", "teambuilding", "indoor"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Wegscheider Str. 22, 4020 Linz",
    estPricePerPerson: 35,
    priceComment: "Spielsession kostet ca. 30–40 € p.P.; Lounge für Feiern kann exklusiv dazu gemietet werden.",
    shortDescription: "Kooperative VR-Missionen auf großer Spielfläche – gemeinsam in die virtuelle Welt eintauchen.",
    longDescription: "Mit VR-Brillen und voller Bewegungsfreiheit erlebt ihr packende Teamspiele, löst Aufgaben im virtuellen Raum und stärkt nebenbei Reaktion, Kommunikation und Zusammenspiel.",
    imageUrl: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "medium",
    typicalDurationHours: 2.5,
    minParticipants: 4,
    recommendedGroupSizeMin: 4,
    recommendedGroupSizeMax: 12,
    physicalIntensity: 4,
    mentalChallenge: 2,
    socialInteractionLevel: 4,
    competitionLevel: 2,
    weatherDependent: false,
    externalRating: 5.0,
    travelTimeMinutes: 10,
    travelTimeMinutesWalking: 94,
    primaryGoal: "teambuilding",
    provider: "Another World VR",
    website: "https://linz.another-world.com/",
    contactPhone: "06641530932",
    contactEmail: "linz@another-world.com",
    coordinates: [48.2625, 14.2750],
  },
  {
    id: "act-10",
    title: "Deep Space 8K: Zukunftstrip im AEC Linz",
    category: "relax",
    tags: ["technik", "innovation", "kultur", "multimedia", "indoor"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Ars-Electronica-Straße 1, 4040 Linz",
    estPricePerPerson: 15,
    priceComment: "Gruppeneintritt + Highlightführung ca. 15 € p.P.; Eventräume für Catering kosten extra Miete.",
    shortDescription: "Immersive 8K-Projektionen auf Wand und Boden – digitale Welten in Riesendimension.",
    longDescription: "Im Deep Space 8K erlebt ihr spektakuläre Visualisierungen, interaktive Inhalte und Wissensshows – ideal für Teams, die sich für Technologie, Kunst und Zukunftsthemen begeistern.",
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 2.5,
    recommendedGroupSizeMin: 10,
    recommendedGroupSizeMax: 50,
    physicalIntensity: 2,
    mentalChallenge: 2,
    socialInteractionLevel: 3,
    competitionLevel: 1,
    weatherDependent: false,
    externalRating: 4.5,
    travelTimeMinutes: 8,
    travelTimeMinutesWalking: 38,
    primaryGoal: "fun",
    provider: "Ars Electronica Linz",
    website: "https://ars.electronica.art/center/de/deepspace/",
    contactPhone: "073272720",
    contactEmail: "center@ars.electronica.art",
    coordinates: [48.3110, 14.2845],
  },
  {
    id: "act-11",
    title: "Segway Tour: Linz schwebend entdecken",
    category: "action",
    tags: ["segway", "outdoor", "sightseeing", "teambuilding"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Hauptpl. 1, 4020 Linz",
    estPricePerPerson: 79,
    priceComment: "Fixpreis pro Person für Tour & Guide (ca. 79 €); kaum Gruppenrabatt, da hohe Equipmentkosten.",
    shortDescription: "Geführte Segway-Tour durch Linz und Umgebung – entspannt gleiten statt gehen.",
    longDescription: "Nach einer kurzen Einschulung schwebt ihr gemeinsam auf Segways durch Stadt, Donauufer oder Natur und erlebt Linz aus einer neuen Perspektive – mit Spaßfaktor und viel Gesprächsstoff fürs Team.",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    season: "summer",
    riskLevel: "medium",
    typicalDurationHours: 2,
    recommendedGroupSizeMin: 4,
    recommendedGroupSizeMax: 12,
    physicalIntensity: 3,
    mentalChallenge: 1,
    socialInteractionLevel: 3,
    competitionLevel: 1,
    weatherDependent: true,
    externalRating: 4.8,
    travelTimeMinutes: 6,
    travelTimeMinutesWalking: 29,
    primaryGoal: "fun",
    provider: "Linzer Schweben",
    website: "https://linzerschweben.at/",
    contactPhone: "069910404044",
    contactEmail: "info@linzerschweben.at",
    coordinates: [48.3059, 14.2865],
  },
  {
    id: "act-12",
    title: "Mural Harbor: Graffiti Walk & Spray Class",
    category: "relax",
    tags: ["graffiti", "streetart", "kreativ", "führung", "teambuilding", "outdoor"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Mural Harbor, Regensburger Str. 2, 4020 Linz",
    estPricePerPerson: 35,
    priceComment: "Nur Führung ca. 15 €; das volle Paket \"Walk & Spray\" (Workshop) kommt auf ca. 35 € p.P.",
    shortDescription: "Graffiti-Rundgang im Linzer Hafen mit Möglichkeit zum selbst Sprayen.",
    longDescription: "Ihr erkundet die Graffiti-Freiluftgalerie im Hafen, erfahrt Hintergründe zu Kunstwerken und Stilrichtungen und könnt im Crashkurs selbst zur Spraydose greifen – kreatives Teamerlebnis mit Erinnerungsfaktor.",
    imageUrl: "https://images.unsplash.com/photo-1569317002804-ab77bcf1bce4?w=800&h=600&fit=crop",
    season: "summer",
    riskLevel: "low",
    typicalDurationHours: 3,
    recommendedGroupSizeMin: 8,
    recommendedGroupSizeMax: 20,
    physicalIntensity: 3,
    mentalChallenge: 1,
    socialInteractionLevel: 3,
    competitionLevel: 1,
    weatherDependent: true,
    externalRating: 4.7,
    travelTimeMinutes: 6,
    travelTimeMinutesWalking: 27,
    primaryGoal: "fun",
    provider: "Verein Mural Harbor",
    website: "https://muralharbor.at/tickets/",
    contactPhone: "06646564619",
    contactEmail: "info@muralharbor.at",
    coordinates: [48.3180, 14.3200],
  },
  {
    id: "act-13",
    title: "Stahlwelt Linz: Werkstour & Industriekultur",
    category: "relax",
    tags: ["industrie", "führung", "technik", "lernen", "teambuilding"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "voestalpine-Straße, 4020 Linz",
    estPricePerPerson: 22,
    priceComment: "Werkstour inkl. Bustransfer ca. 22 €; Mittagessen in der Kantine oder Catering ist extra zu kalkulieren.",
    shortDescription: "Werksführung mit Blick in die moderne Stahlproduktion und den größten Industriestandort Österreichs.",
    longDescription: "Mit Guides und Multimediabussen fahrt ihr über das Werksgelände, seht Anlagen aus nächster Nähe und lernt die Reise vom Rohstoff bis zum fertigen Stahl kennen – spannend für technikaffine Teams.",
    imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 3,
    recommendedGroupSizeMin: 10,
    recommendedGroupSizeMax: 40,
    physicalIntensity: 2,
    mentalChallenge: 1,
    socialInteractionLevel: 2,
    competitionLevel: 1,
    weatherDependent: false,
    externalRating: 4.6,
    travelTimeMinutes: 7,
    travelTimeMinutesWalking: 43,
    primaryGoal: "fun",
    provider: "voestalpine Stahlwelt",
    website: "https://www.voestalpine.com/stahlwelt/",
    contactPhone: "050304158900",
    contactEmail: "anmeldung.stahlwelt@voestalpine.com",
    coordinates: [48.2790, 14.3400],
  },
  {
    id: "act-14",
    title: "Stefan's Stubm: Kulinarik & Gemütlichkeit",
    category: "food",
    tags: ["restaurant", "österreichische-küche", "essen", "gemütlich", "teamevent"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Garnisonstraße 30, 4020 Linz",
    estPricePerPerson: 40,
    priceComment: "Reiner Verzehrwert; für ein 3-Gänge-Menü inkl. Getränke solltet ihr mit ca. 40–50 € p.P. rechnen.",
    shortDescription: "Österreichische Küche in gemütlicher Stubn-Atmosphäre.",
    longDescription: "In der warmen Wirtshaus-Atmosphäre genießt ihr traditionelle Speisen, regionale Produkte und viel Gemütlichkeit – ideal für gesellige Teamessen und kleinere Feiern.",
    imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 3,
    recommendedGroupSizeMin: 6,
    recommendedGroupSizeMax: 30,
    physicalIntensity: 1,
    mentalChallenge: 1,
    socialInteractionLevel: 4,
    competitionLevel: 1,
    weatherDependent: false,
    externalRating: 4.6,
    travelTimeMinutes: 2,
    travelTimeMinutesWalking: 7,
    primaryGoal: "reward",
    provider: "Stefan's Stubm",
    website: "https://www.stubm.at/",
    contactPhone: "0732770555",
    contactEmail: "office@stefans-stubm.at",
    coordinates: [48.3045, 14.3050],
  },
  {
    id: "act-15",
    title: "Il Teatro: Italienischer Abend fürs Team",
    category: "food",
    tags: ["restaurant", "italienisch", "pizza", "pasta", "teamevent"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Hamerlingstraße 46, 4020 Linz",
    estPricePerPerson: 35,
    priceComment: "Pizza/Pasta ist günstiger (~25 € inkl. Drink); bei Fleisch/Fisch und Wein eher 40–50 € p.P.",
    shortDescription: "Italienisches Restaurant mit Pizza, Pasta und mediterranem Flair.",
    longDescription: "Bei Antipasti, Pasta und Pizza sitzt ihr gemeinsam in entspanntem Ambiente und könnt das Team bei gutem Essen näher zusammenbringen – vom Business-Lunch bis zum Abendessen.",
    imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 2.5,
    recommendedGroupSizeMin: 6,
    recommendedGroupSizeMax: 40,
    physicalIntensity: 1,
    mentalChallenge: 1,
    socialInteractionLevel: 4,
    competitionLevel: 1,
    weatherDependent: false,
    externalRating: 4.5,
    travelTimeMinutes: 6,
    travelTimeMinutesWalking: 14,
    primaryGoal: "reward",
    provider: "Ristorante Il Teatro",
    website: "https://www.ilteatro.at/",
    contactPhone: "0732662580",
    contactEmail: "office@ilteatro.at",
    coordinates: [48.2970, 14.2950],
  },
  // ============ Additional OOE Activities ============ 
  {
    id: "act-16",
    title: "Das Josef: Der Linzer Gastro-Klassiker",
    category: "food",
    tags: ["restaurant", "wirtshaus", "bar", "österreichische-küche", "teamevent"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Landstraße 49, 4020 Linz",
    estPricePerPerson: 35,
    priceComment: "À la carte Verzehr typischerweise 30–40 €; Buffet-Optionen für große geschlossene Gruppen möglich.",
    shortDescription: "Modernes Wirtshaus mit großer Speise- und Getränkekarte im Zentrum von Linz.",
    longDescription: "Zeitgemäße Wirtshausküche, viele Bier- und Weinoptionen und lebendige Atmosphäre machen das JOSEF zur vielseitigen Location für Teamdinner, Afterwork oder Stammtisch.",
    imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 3.5,
    recommendedGroupSizeMin: 8,
    recommendedGroupSizeMax: 40,
    physicalIntensity: 1,
    mentalChallenge: 1,
    socialInteractionLevel: 4,
    competitionLevel: 1,
    weatherDependent: false,
    externalRating: 4.1,
    travelTimeMinutes: 5,
    travelTimeMinutesWalking: 21,
    primaryGoal: "reward",
    provider: "Josef Gastro GmbH",
    website: "https://josef.eu/",
    contactPhone: "0732773165",
    contactEmail: "gastronomie@josef.eu",
    coordinates: [48.3035, 14.2915],
  },
  {
    id: "act-17",
    title: "PAULs am Dom: Stylisches Dinner & Drinks",
    category: "food",
    tags: ["restaurant", "burger", "steak", "bar", "teamevent"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Domplatz 3, 4020 Linz",
    estPricePerPerson: 50,
    priceComment: "Gehobenes Preisniveau; für Steaks/Burger plus Cocktails liegt man schnell bei 50 €+ p.P.",
    shortDescription: "Stylishes Restaurant mit kreativer Küche und entspannter Bar-Atmosphäre.",
    longDescription: "Zwischen Burgern, Steaks, Bowls und modernen Klassikern findet jede:r etwas – kombiniert mit Drinks und urbanem Ambiente eine gute Wahl für lockere Firmenessen.",
    imageUrl: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 3.5,
    recommendedGroupSizeMin: 8,
    recommendedGroupSizeMax: 30,
    physicalIntensity: 1,
    mentalChallenge: 1,
    socialInteractionLevel: 4,
    competitionLevel: 1,
    weatherDependent: false,
    externalRating: 4.4,
    travelTimeMinutes: 8,
    travelTimeMinutesWalking: 26,
    primaryGoal: "reward",
    provider: "PAULS",
    website: "https://www.pauls-linz.at/",
    contactPhone: "0732783338",
    contactEmail: "office@pauls-linz.at",
    coordinates: [48.3048, 14.2885],
  },
  {
    id: "act-18",
    title: "Weinstadl Urfahr: Uriges Dinner & Wein",
    category: "food",
    tags: ["heuriger", "restaurant", "wein", "österreichische-küche", "teamevent"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Griesmayrstraße 18, 4040 Linz",
    estPricePerPerson: 45,
    priceComment: "Typischer Heurigen-Konsum oder 'Reindl-Essen' kommt auf ca. 35–45 € inkl. Weinbegleitung.",
    shortDescription: "Gemütlicher Weinstadl mit regionaler Küche und schöner Weinauswahl.",
    longDescription: "In uriger Atmosphäre genießt ihr bodenständige Speisen, Jausen und passende Weine – perfekt für ein entspanntes, geselliges Beisammensein abseits des Büroalltags.",
    imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=600&fit=crop",
    season: "summer",
    riskLevel: "low",
    typicalDurationHours: 3.5,
    minParticipants: 1,
    recommendedGroupSizeMin: 8,
    recommendedGroupSizeMax: 30,
    physicalIntensity: 1,
    mentalChallenge: 1,
    socialInteractionLevel: 4,
    competitionLevel: 1,
    weatherDependent: false,
    externalRating: 4.5,
    travelTimeMinutes: 9,
    travelTimeMinutesWalking: 72,
    primaryGoal: "reward",
    provider: "Weinstadl Urfahr",
    website: "https://weinstadl-urfahr.eatbu.com/?lang=de",
    contactPhone: "0732730620",
    contactEmail: "office@weinstadl-urfahr.at",
    coordinates: [48.3150, 14.2810],
  },
  {
    id: "act-19",
    title: "Eisstockschießen & Bratl: Winter-Teamevent",
    category: "party",
    tags: ["eisstockschiessen", "winter", "sport", "teambuilding", "outdoor"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Untere Donaulände 11, 4020 Linz",
    estPricePerPerson: 28,
    priceComment: "Bahnmiete (geteilt) + Leihstock ca. 10 €; das klassische 'Bratl in der Rein' danach kostet ca. 18–20 € p.P.",
    shortDescription: "'Bratlschießen' (Eisstockschießen) als lockerer Teamwettbewerb auf dem Eis.",
    longDescription: "In Teams tretet ihr beim Eisstockschießen gegeneinander an, feuert euch an, lacht über knappe Entscheidungen und erlebt spielerische Spannung – ein winterliches Teamevent mit Humor.",
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop",
    season: "winter",
    riskLevel: "low",
    typicalDurationHours: 3.5,
    recommendedGroupSizeMin: 8,
    recommendedGroupSizeMax: 30,
    physicalIntensity: 3,
    mentalChallenge: 1,
    socialInteractionLevel: 4,
    competitionLevel: 3,
    weatherDependent: true,
    externalRating: 4.5,
    travelTimeMinutes: 6,
    travelTimeMinutesWalking: 28,
    primaryGoal: "fun",
    provider: "LINZ AG (Parkbad)",
    website: "https://www.linzag.at/portal/de/privatkunden/freizeit/eissport/eisstockschiessen",
    contactPhone: "073234006630",
    contactEmail: "sport@linzag.at",
    coordinates: [48.3145, 14.2940],
  },
  {
    id: "act-20",
    title: "Hollywood Megaplex: Privates Kino-Event",
    category: "relax",
    tags: ["kino", "eventlocation", "präsentation", "teamevent", "indoor"],
    locationRegion: "OOE",
    locationCity: "Pasching",
    locationAddress: "Plus-Kauf-Straße 7, 4061 Pasching",
    estPricePerPerson: 25,
    priceComment: "Kinoticket + Popcorn/Drink-Menü ca. 20–25 €; Saalmiete variiert je nach Uhrzeit/Film stark.",
    shortDescription: "Exklusiv angemieteter Kinosaal für Film, Präsentation oder Firmenfeier.",
    longDescription: "Ob gemeinsamer Kinofilm, Produktpräsentation oder Jahresrückblick – im eigenen Saal mit großer Leinwand, Popcorn und Kinofeeling schafft ihr einen besonderen Rahmen für euer Event.",
    imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 3,
    recommendedGroupSizeMin: 10,
    recommendedGroupSizeMax: 100,
    physicalIntensity: 1,
    mentalChallenge: 1,
    socialInteractionLevel: 3,
    competitionLevel: 1,
    weatherDependent: false,
    externalRating: 4.5,
    travelTimeMinutes: 14,
    travelTimeMinutesWalking: 125,
    primaryGoal: "fun",
    provider: "Hollywood Megaplex",
    website: "https://www.megaplex.at/inhalt/kino-zum-mieten",
    contactPhone: "0722963500",
    contactEmail: "pasching@megaplex.at",
    coordinates: [48.2435, 14.2385],
  },
  {
    id: "act-21",
    title: "Cocktail-Kurs im Lennox: Mix it up Team!",
    category: "party",
    tags: ["cocktailkurs", "bar", "mixology", "teambuilding", "indoor"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Marienstraße 2a, 4020 Linz",
    estPricePerPerson: 59,
    priceComment: "Fixpreis für den Workshop (inkl. Mixen & Trinken der Cocktails); keine versteckten Kosten.",
    shortDescription: "Geführter Cocktailkurs mit Profibarkeepern – shaken, rühren, verkosten.",
    longDescription: "Ihr lernt die Basics der Cocktailkunst, mixt gemeinsam verschiedene Drinks (auch alkoholfrei) und könnt dabei in entspannter Bar-Atmosphäre viel Spaß haben und das Team besser vernetzen.",
    imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 3,
    recommendedGroupSizeMin: 8,
    recommendedGroupSizeMax: 25,
    physicalIntensity: 2,
    mentalChallenge: 1,
    socialInteractionLevel: 4,
    competitionLevel: 1,
    weatherDependent: false,
    externalRating: 4.8,
    travelTimeMinutes: 6,
    travelTimeMinutesWalking: 25,
    primaryGoal: "fun",
    provider: "Lennox Bar",
    website: "https://www.lennox.at/events/cocktailkurse/",
    contactPhone: "06644104100",
    contactEmail: "bar@lennox.at",
    coordinates: [48.3040, 14.2910],
  },
  {
    id: "act-22",
    title: "ÄNGUS Downtown: Bestes Steak-Dinner Linz",
    category: "food",
    tags: ["restaurant", "steak", "grill", "teamevent"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Pfarrpl. 13, 4020 Linz",
    estPricePerPerson: 60,
    priceComment: "Premium Steakhouse; für Vorspeise, Steak und guten Wein muss man mit 70–90 € p.P. kalkulieren.",
    shortDescription: "Steak- und Grillrestaurant im Zentrum – Fokus auf hochwertigem Fleisch.",
    longDescription: "Saftige Steaks, Burger und Beilagen in modernem Ambiente: Hier wird Fleischliebe großgeschrieben und euer Teamdinner zum herzhaften Genusserlebnis.",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 3,
    recommendedGroupSizeMin: 6,
    recommendedGroupSizeMax: 30,
    physicalIntensity: 1,
    mentalChallenge: 1,
    socialInteractionLevel: 4,
    competitionLevel: 1,
    weatherDependent: false,
    externalRating: 4.7,
    travelTimeMinutes: 8,
    travelTimeMinutesWalking: 27,
    primaryGoal: "reward",
    provider: "ÄNGUS Downtown",
    website: "https://aengus.at/",
    contactPhone: "0732771515",
    contactEmail: "restaurant@aengus.at",
    coordinates: [48.3065, 14.2880],
  },
  {
    id: "act-23",
    title: "Glorious Bastards: Pizza, Grill & Vibes",
    category: "food",
    tags: ["restaurant", "steak", "burger", "pizza", "craft-beer", "teamevent"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Promenade 25, 4020 Linz",
    estPricePerPerson: 40,
    priceComment: "Burger/Pizza-Konzern; mit 2-3 Getränken und Hauptspeise landet man meist bei soliden 35–45 €.",
    shortDescription: "Stylishes Meat-&-Pizza-Konzept mit offener Küche und Industrial-Charme.",
    longDescription: "Dry-Aged-Steaks, Holzofenpizza und Craft Beer treffen auf laute, lebendige Stimmung – ideal für Teams, die es modern, locker und etwas lauter mögen.",
    imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 3,
    recommendedGroupSizeMin: 8,
    recommendedGroupSizeMax: 40,
    physicalIntensity: 1,
    mentalChallenge: 1,
    socialInteractionLevel: 4,
    competitionLevel: 1,
    weatherDependent: false,
    externalRating: 4.1,
    travelTimeMinutes: 7,
    travelTimeMinutesWalking: 31,
    primaryGoal: "reward",
    provider: "Glorious Bastards",
    website: "https://glorious-bastards.at/",
    contactPhone: "0732773322",
    contactEmail: "linz@glorious-bastards.at",
    coordinates: [48.3030, 14.2885],
  },
  {
    id: "act-24",
    title: "Bratwurstglöckerl: Linzer Wirtshauskultur",
    category: "food",
    tags: ["restaurant", "wirtshaus", "grill", "österreichische-küche", "teamevent"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Angerholzerweg 38, 4020 Linz",
    estPricePerPerson: 35,
    priceComment: "Bodenständig; Hauptspeise + Bier + Kaffee kommt meist auf faire 30–35 € p.P.",
    shortDescription: "Traditionsgasthaus mit Fokus auf Bratwürste und deftige Hausmannskost.",
    longDescription: "In klassischer Wirtshausatmosphäre genießt ihr Grill- und Pfannengerichte, Bier und regionale Schmankerl – perfekt für unkomplizierte, bodenständige Teamabende.",
    imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 3,
    recommendedGroupSizeMin: 8,
    recommendedGroupSizeMax: 50,
    physicalIntensity: 1,
    mentalChallenge: 1,
    socialInteractionLevel: 4,
    competitionLevel: 1,
    weatherDependent: false,
    externalRating: 4.5,
    travelTimeMinutes: 9,
    travelTimeMinutesWalking: 60,
    primaryGoal: "reward",
    provider: "Bratwurstglöckerl",
    website: "https://www.bratwurstgloeckerl.at/",
    contactPhone: "0732779388",
    contactEmail: "office@bratwurstgloeckerl.at",
    coordinates: [48.2830, 14.2860],
  },
  {
    id: "act-25",
    title: "Stadtliebe Linz: Urbanes Wirtshaus-Event",
    category: "food",
    tags: ["restaurant", "bar", "brunch", "modern", "teamevent"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Landstraße 31, 4020 Linz",
    estPricePerPerson: 40,
    priceComment: "Modernes Wirtshaus; Menüs für Gruppen ab ca. 35 €, mit Getränken realistisch 40–50 €.",
    shortDescription: "Trendige Mischung aus Restaurant, Bar und Café mitten in Linz.",
    longDescription: "Von Frühstück und Brunch über kreative Speisen bis hin zu Cocktails am Abend – die Stadtliebe bietet einen flexiblen Rahmen für Teamtreffen zu fast jeder Tageszeit.",
    imageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 3,
    recommendedGroupSizeMin: 8,
    recommendedGroupSizeMax: 35,
    physicalIntensity: 1,
    mentalChallenge: 1,
    socialInteractionLevel: 4,
    competitionLevel: 1,
    weatherDependent: false,
    externalRating: 4.1,
    travelTimeMinutes: 5,
    travelTimeMinutesWalking: 24,
    primaryGoal: "reward",
    provider: "Stadtliebe Linz",
    website: "https://www.stadtliebe.at/",
    contactPhone: "0732770605",
    contactEmail: "office@stadtliebe.at",
    coordinates: [48.3015, 14.2905],
  },
  {
    id: "act-26",
    title: "Wia z'haus Lehner: Schmankerl & Ausblick",
    category: "food",
    tags: ["wirtshaus", "österreichische-küche", "traditionell", "teamevent"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Harbacher Str. 38, 4040 Linz",
    estPricePerPerson: 35,
    priceComment: "Klassischer Verzehr; 'Bratl'-Essen für Gruppen oft günstiger, à la carte ca. 35 € inkl. Getränke.",
    shortDescription: "Traditionelles Wirtshaus mit regionaler Küche und viel Gemütlichkeit.",
    longDescription: "Holzvertäfelung, große Portionen und herzlicher Service sorgen für klassisches Wirtshausgefühl – ideal für Teams, die es ehrlich, bodenständig und ohne Schnickschnack mögen.",
    imageUrl: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 3,
    recommendedGroupSizeMin: 8,
    recommendedGroupSizeMax: 40,
    physicalIntensity: 1,
    mentalChallenge: 1,
    socialInteractionLevel: 4,
    competitionLevel: 1,
    weatherDependent: false,
    externalRating: 4.4,
    travelTimeMinutes: 8,
    travelTimeMinutesWalking: 64,
    primaryGoal: "reward",
    provider: "Wia z'haus Lehner",
    website: "https://www.wiazhaus-lehner.at/",
    contactPhone: "0732730510",
    contactEmail: "gasthaus@wiazhaus-lehner.at",
    coordinates: [48.3305, 14.2930],
  },
  {
    id: "act-27",
    title: "Zur Eisernen Hand: Tradition & Genuss",
    category: "food",
    tags: ["gasthaus", "österreichische-küche", "traditionell", "teamevent"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Eisenhandstraße 43, 4020 Linz",
    estPricePerPerson: 35,
    priceComment: "Uriges Wirtshaus; Schnitzel/Bratl + Getränke liegen im Schnitt bei 30–40 € p.P.",
    shortDescription: "Gutbürgerliches Gasthaus mit klassischen Speisen und saisonalen Gerichten.",
    longDescription: "In entspannter Atmosphäre genießt ihr regionale Küche, Stammtischflair und viel Platz für Gespräche – geeignet für gemütliche Teamessen oder Familienfeiern.",
    imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop",
    season: "summer",
    riskLevel: "low",
    typicalDurationHours: 3,
    recommendedGroupSizeMin: 8,
    recommendedGroupSizeMax: 40,
    physicalIntensity: 1,
    mentalChallenge: 1,
    socialInteractionLevel: 4,
    competitionLevel: 1,
    weatherDependent: false,
    externalRating: 4.6,
    travelTimeMinutes: 3,
    travelTimeMinutesWalking: 13,
    primaryGoal: "reward",
    provider: "Gasthaus Eiserne Hand",
    website: "https://www.gasthaus-eisernehand.at/",
    contactPhone: "0732773335",
    contactEmail: "gasthaus@eisernehand.at",
    coordinates: [48.3025, 14.2995],
  },
  {
    id: "act-28",
    title: "Rotax MAX Dome: High-Speed E-Kart Action",
    category: "action",
    tags: ["e-kart", "kartfahren", "action", "indoor", "teambuilding"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Holzstraße 3, 4020 Linz",
    estPricePerPerson: 45,
    priceComment: "Renn-Pakete (Training, Quali, Rennen) starten ab ca. 45 €; Premium-Events mit Siegerehrung bis 70 €.",
    shortDescription: "E-Kart-Action auf der modernen Indoor-Bahn – emissionsfrei und rasant.",
    longDescription: "Auf der modernen Indoor-E-Kartbahn jagt ihr emissionsfrei über die Strecke, fahrt Qualifying und Rennen und kürt am Ende euer Team-Podium – Adrenalin pur, auch bei Schlechtwetter.",
    imageUrl: "https://images.unsplash.com/photo-1504945005722-33670dcaf685?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "high",
    typicalDurationHours: 3,
    recommendedGroupSizeMin: 8,
    recommendedGroupSizeMax: 30,
    physicalIntensity: 5,
    mentalChallenge: 2,
    socialInteractionLevel: 2,
    competitionLevel: 5,
    weatherDependent: false,
    externalRating: 4.5,
    travelTimeMinutes: 5,
    travelTimeMinutesWalking: 32,
    primaryGoal: "teambuilding",
    provider: "Rotax MAX Dome",
    website: "https://www.rotaxmaxdome.com/linz/",
    contactPhone: "0732799899",
    contactEmail: "linz@rotaxmaxdome.com",
    coordinates: [48.3120, 14.3090],
  },
  {
    id: "act-29",
    title: "Booosters Kartbahn: Rennfeeling für Teams",
    category: "action",
    tags: ["kartfahren", "action", "eventlocation", "teambuilding", "gastro"],
    locationRegion: "OOE",
    locationCity: "Leonding",
    locationAddress: "Im Bäckerfeld 1, 4060 Leonding",
    estPricePerPerson: 40,
    priceComment: "Gruppen-Grand-Prix (inkl. Qualifying & Rennen) kostet ca. 38–45 € p.P.; Bahn exklusiv mietbar.",
    shortDescription: "Kart-Racing + Gastro für bis zu 100 Personen, Rundum-Service für Firmenfeiern.",
    longDescription: "Vom Fahrerbriefing über Rennen bis zur Siegerehrung wird euer Event komplett organisiert; dazu kommen Gastronomie und Aufenthaltsbereiche – ideal für große Gruppen und Firmenfeste mit Racing-Faktor.",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "high",
    typicalDurationHours: 4,
    recommendedGroupSizeMin: 10,
    recommendedGroupSizeMax: 100,
    physicalIntensity: 5,
    mentalChallenge: 2,
    socialInteractionLevel: 2,
    competitionLevel: 5,
    weatherDependent: false,
    externalRating: 4.3,
    travelTimeMinutes: 14,
    travelTimeMinutesWalking: 110,
    primaryGoal: "teambuilding",
    provider: "Booosters",
    website: "https://booosters.at/",
    contactPhone: "0722921700",
    contactEmail: "office@booosters.at",
    coordinates: [48.2605, 14.2498],
  },
  {
    id: "act-30",
    title: "Mission Games: Die Live Game-Show Linz",
    category: "action",
    tags: ["actiongame", "rätsel", "geschicklichkeit", "teambuilding", "indoor"],
    locationRegion: "OOE",
    locationCity: "Linz",
    locationAddress: "Hauptstraße 16/1. Stock, 4040 Linz",
    estPricePerPerson: 34,
    priceComment: "Preisstaffelung: Ab 13 Personen ca. 34 € p.P., kleinere Gruppen zahlen etwas mehr (bis 39 €).",
    shortDescription: "Indoor-Actionspiel mit vielen Missionräumen, in denen Geschick und Teamwork zählen.",
    longDescription: "Auf mehreren hundert Quadratmetern warten unterschiedlichste Räume mit Aufgaben zu Reaktion, Geschicklichkeit, Logik und Teamplay – ihr sammelt Punkte, probiert Missionen aus und feuert euch gegenseitig an.",
    imageUrl: "https://images.unsplash.com/photo-1511882150382-421056c89033?w=800&h=600&fit=crop",
    season: "all_year",
    riskLevel: "low",
    typicalDurationHours: 3.5,
    recommendedGroupSizeMin: 6,
    recommendedGroupSizeMax: 60,
    physicalIntensity: 2,
    mentalChallenge: 5,
    socialInteractionLevel: 5,
    competitionLevel: 3,
    weatherDependent: false,
    externalRating: 4.9,
    travelTimeMinutes: 7,
    travelTimeMinutesWalking: 38,
    primaryGoal: "teambuilding",
    provider: "Mission Games",
    website: "https://missiongames.at/",
    contactPhone: "06606363063",
    contactEmail: "office@missiongames.at",
    coordinates: [48.3135, 14.2825],
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

export async function createRoom(input: { name: string; description?: string }): Promise<ApiResult<Room>> {
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