import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { DivIcon, LatLngBounds } from "leaflet";
import { motion } from "framer-motion";
import { MapPin, Euro, Clock, ExternalLink, Car, FootprintsIcon, X, Zap, UtensilsCrossed, Sparkles, PartyPopper, Landmark, TreePine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { useActivities } from "@/hooks/use-activities";
import type { Activity, EventCategory } from "@/types/domain";
import { CategoryLabels, CategoryColors, RegionLabels } from "@/types/domain";
import { cn } from "@/lib/utils";
import { getActivityDurationMinutes, formatDuration as formatDurationUtil, type ActivityFilters, defaultFilters } from "@/utils/activityUtils";
import "leaflet/dist/leaflet.css";

const EMPTY_ACTIVITIES: Activity[] = [];

// Category icons for quick filters
const CategoryIcons: Record<EventCategory, React.ReactNode> = {
  action: <Zap className="h-4 w-4" />,
  food: <UtensilsCrossed className="h-4 w-4" />,
  relax: <Sparkles className="h-4 w-4" />,
  party: <PartyPopper className="h-4 w-4" />,
};

// Helper function to get color based on walking time
function getMarkerColor(walkingTime: number | undefined): string {
  if (!walkingTime) return "#94a3b8"; // gray for no data

  // Define thresholds
  if (walkingTime <= 10) return "#22c55e"; // green (0-10 min)
  if (walkingTime <= 20) return "#84cc16"; // lime (10-20 min)
  if (walkingTime <= 30) return "#eab308"; // yellow (20-30 min)
  if (walkingTime <= 45) return "#f97316"; // orange (30-45 min)
  return "#ef4444"; // red (45+ min)
}

// Create custom marker icon with color
function createColoredIcon(walkingTime: number | undefined): DivIcon {
  const color = getMarkerColor(walkingTime);

  return new DivIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transform: rotate(-45deg);
        position: relative;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

// Region defaults (Austria)
const regionCoordinates: Record<string, [number, number]> = {
  OOE: [48.3064, 14.2858], // Linz
  TIR: [47.2692, 11.4041], // Innsbruck
  SBG: [47.8095, 13.055],  // Salzburg
  STMK: [47.0707, 15.4395], // Graz
  KTN: [46.6247, 14.3053], // Klagenfurt
  VBG: [47.4245, 9.7438],  // Bregenz
  NOE: [48.2082, 16.3738], // Wien area
  WIE: [48.2082, 16.3738], // Wien
  BGL: [47.8452, 16.5287], // Eisenstadt
};

const AUSTRIA_CENTER: [number, number] = [47.5, 13.5];

function getRegionCenter(region: Activity["locationRegion"]): [number, number] | null {
  return regionCoordinates[region] || null;
}

function buildAddressQuery(activity: Activity): string | null {
  const parts = [
    activity.locationAddress,
    activity.locationCity,
    RegionLabels[activity.locationRegion],
    "Austria",
  ].filter(Boolean);

  if (!parts.length) return null;
  return parts.join(", ");
}

async function geocodeAddress(address: string): Promise<[number, number] | null> {
  if (!address) return null;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&addressdetails=0&limit=1&countrycodes=at`;

  try {
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "de",
        "User-Agent": "eventhorizon-map/1.0 (contact: frontend)",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const { lat, lon } = data[0];
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);

      if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
        return [latitude, longitude];
      }
    }
  } catch (error) {
    console.warn("Geocoding failed for address", address, error);
  }

      return null;

  }

  

  // Component for map event handling

  function MapEventHandlers({ 

    activityMarkers, 

    selectedActivity 

  }: { 

    activityMarkers: { activity: Activity; position: [number, number] }[];

    selectedActivity: Activity | null;

  }) {

    const map = useMap();

  

    // Fit all markers on initial load or when activityMarkers change

    useEffect(() => {

      if (activityMarkers.length > 0) {

        const bounds = new LatLngBounds(activityMarkers.map(m => m.position));

        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });

      } else {

        map.setView(AUSTRIA_CENTER, 7); // Fallback if no markers

      }

    }, [activityMarkers, map]);

  



    

    return null;

  }

  

  // Component for markers to avoid context issues
function MapMarkers({
  activityMarkers,
  onSelect
}: {
  activityMarkers: { activity: Activity; position: [number, number] }[];
  onSelect: (activity: Activity) => void;
}) {
  return (
    <>
      {activityMarkers.map(({ activity, position }) => (
        <Marker
          key={activity.id}
          position={position}
          icon={createColoredIcon(activity.travelTimeMinutesWalking)}
          eventHandlers={{
            click: () => onSelect(activity),
          }}
        />
      ))}
    </>
  );
}

export default function MapPage() {
  const { data: activitiesData, isLoading: loading } = useActivities();
  const resolvedActivities = activitiesData ?? EMPTY_ACTIVITIES;
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [geocodeCache, setGeocodeCache] = useState<Record<string, [number, number]>>({});
  const [filters, setFilters] = useState<ActivityFilters>(defaultFilters);

  // Filter handlers
  const toggleCategory = (category: EventCategory) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const clearFilters = () => setFilters(defaultFilters);

  const activities = useMemo(() => {
    return [...resolvedActivities].sort((a, b) => {
      const timeA = a.travelTimeMinutesWalking ?? Infinity;
      const timeB = b.travelTimeMinutesWalking ?? Infinity;
      return timeA - timeB;
    });
  }, [resolvedActivities]);

  // Filtered activities based on category selection
  const filteredActivities = useMemo(() => {
    if (filters.categories.length === 0) return activities;
    return activities.filter((a) => filters.categories.includes(a.category));
  }, [activities, filters.categories]);

  const getDisplayDuration = (activity: Activity) => {
    const mins = getActivityDurationMinutes(activity);
    return mins ? formatDurationUtil(mins) : "-";
  };

  useEffect(() => {
    const missing = activities.filter((activity) =>
      !activity.coordinates &&
      !geocodeCache[activity.id] &&
      (activity.locationAddress || activity.locationCity)
    );

    if (!missing.length) return;

    let cancelled = false;

    const geocodeMissing = async () => {
      const updates: Record<string, [number, number]> = {};

      for (const activity of missing) {
        const query = buildAddressQuery(activity);
        if (!query) continue;

        const coords = await geocodeAddress(query);
        if (cancelled) return;

        if (coords) {
          updates[activity.id] = coords;
        }

        // Be polite towards the geocoding service
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (!cancelled && Object.keys(updates).length > 0) {
        setGeocodeCache((prev) => ({ ...prev, ...updates }));
      }
    };

    geocodeMissing();

    return () => {
      cancelled = true;
    };
  }, [activities, geocodeCache]);

  const activityMarkers = useMemo(
    () =>
      filteredActivities.reduce((markers, activity) => {
        const position =
          activity.coordinates ||
          geocodeCache[activity.id] ||
          getRegionCenter(activity.locationRegion);

        if (position) {
          markers.push({ activity, position });
        }
        return markers;
      }, [] as { activity: Activity; position: [number, number] }[]),
    [filteredActivities, geocodeCache]
  );

  const mapCenter = activityMarkers[0]?.position || AUSTRIA_CENTER;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Aktivitäten-Karte"
          description="Entdecke Aktivitäten in deiner Region"
        />
        <div className="h-[600px] rounded-2xl bg-secondary/30 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aktivitäten-Karte"
        description="Entdecke Aktivitäten in deiner Region direkt auf der Karte"
      />

      {/* Quick Category Filters */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 hide-scrollbar">
        {(Object.keys(CategoryLabels) as EventCategory[]).map((category) => (
          <Button
            key={category}
            variant={filters.categories.includes(category) ? "default" : "secondary"}
            size="sm"
            onClick={() => toggleCategory(category)}
            className={cn(
              "shrink-0 gap-2 h-9 px-4 rounded-xl transition-all",
              filters.categories.includes(category)
                ? "shadow-md"
                : "hover:bg-secondary/80 hover:border-primary/30"
            )}
          >
            {CategoryIcons[category]}
            {CategoryLabels[category]}
          </Button>
        ))}
        {filters.categories.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="shrink-0 gap-1 text-xs h-8 rounded-lg"
          >
            <X className="h-3.5 w-3.5" />
            Zurücksetzen
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2"
        >
          <Card className="bg-card/60 border-border/50 rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="h-[600px] relative z-0">
                <MapContainer
                  center={mapCenter}
                  zoom={7}
                  className="h-full w-full rounded-2xl relative z-0"
                  style={{ background: "hsl(var(--secondary))", zIndex: 0 }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapEventHandlers
                    activityMarkers={activityMarkers}
                    selectedActivity={selectedActivity}
                  />
                  <MapMarkers
                    activityMarkers={activityMarkers}
                    onSelect={setSelectedActivity}
                  />
                </MapContainer>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 z-[1000] bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl p-3 shadow-lg">
                  <p className="text-xs font-semibold mb-2">Gehzeit von der Firma</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#22c55e" }} />
                      <span>0-10 Min.</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#84cc16" }} />
                      <span>10-20 Min.</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#eab308" }} />
                      <span>20-30 Min.</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f97316" }} />
                      <span>30-45 Min.</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ef4444" }} />
                      <span>45+ Min.</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#94a3b8" }} />
                      <span>Keine Angabe</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity List / Details */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {selectedActivity ? (
            // Selected Activity Detail
            <Card className="bg-card/60 border-primary/30 rounded-2xl">
              <CardContent className="p-0">
                <img
                  src={selectedActivity.imageUrl}
                  alt={selectedActivity.title}
                  className="w-full h-40 object-cover rounded-t-2xl"
                />
                <div className="p-4">
                  <Badge className={cn("mb-2", CategoryColors[selectedActivity.category])}>
                    {CategoryLabels[selectedActivity.category]}
                  </Badge>
                  <h3 className="font-semibold text-lg">{selectedActivity.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedActivity.shortDescription}
                  </p>

                  <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{selectedActivity.locationCity || RegionLabels[selectedActivity.locationRegion]}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Euro className="h-3.5 w-3.5" />
                      <span>ab {selectedActivity.estPricePerPerson}€</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{getDisplayDuration(selectedActivity)}</span>
                    </div>
                    {selectedActivity.travelTimeMinutesWalking && (
                      <div className="flex items-center gap-1">
                        <FootprintsIcon className="h-3.5 w-3.5" />
                        <span>{selectedActivity.travelTimeMinutesWalking} Min.</span>
                      </div>
                    )}
                    {selectedActivity.travelTimeMinutes && (
                      <div className="flex items-center gap-1">
                        <Car className="h-3.5 w-3.5" />
                        <span>{selectedActivity.travelTimeMinutes} Min.</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button asChild className="flex-1 rounded-xl gap-2" size="sm">
                      <Link to={`/activities/${selectedActivity.slug}`}>
                        <ExternalLink className="h-4 w-4" />
                        Details
                      </Link>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setSelectedActivity(null)}
                    >
                      Schließen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Activity List
            <>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">
                  {filteredActivities.length === activities.length
                    ? `${activities.length} Aktivitäten`
                    : `${filteredActivities.length} von ${activities.length}`}
                </h3>
                {filters.categories.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.categories.length} Filter
                  </Badge>
                )}
              </div>

              {filteredActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Keine Aktivitäten für diese Kategorie.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="mt-4 rounded-xl"
                  >
                    Filter zurücksetzen
                  </Button>
                </div>
              ) : (
              <div className="space-y-3 max-h-[540px] overflow-y-auto pr-2">
                {filteredActivities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                  >
                    <Card
                      className={cn(
                        "bg-card/60 border-border/50 rounded-xl cursor-pointer transition-all",
                        "hover:bg-card/80 hover:border-primary/30"
                      )}
                      onClick={() => setSelectedActivity(activity)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <img
                          src={activity.imageUrl}
                          alt={activity.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{activity.title}</p>
                          {(activity.travelTimeMinutesWalking || activity.travelTimeMinutes) && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {activity.travelTimeMinutesWalking && (
                                <div className="flex items-center gap-1">
                                  <FootprintsIcon className="h-3 w-3" />
                                  <span>{activity.travelTimeMinutesWalking} Min.</span>
                                </div>
                              )}
                              {activity.travelTimeMinutes && (
                                <div className="flex items-center gap-1">
                                  <Car className="h-3 w-3" />
                                  <span>{activity.travelTimeMinutes} Min.</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
