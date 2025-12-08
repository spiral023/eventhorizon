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
    imageUrl: "https://images.unsplash.com/photo-1533372343425-4a7a1e2f56db?w=800&h=600&fit=crop",
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
    imageUrl: "https://images.unsplash.com/photo-1509248961725-aec71c1d85ab?w=800&h=600&fit=crop",
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
