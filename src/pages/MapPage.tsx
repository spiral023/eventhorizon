import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon, LatLngBounds } from "leaflet";
import { motion } from "framer-motion";
import { MapPin, Euro, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { getActivities } from "@/services/apiClient";
import type { Activity } from "@/types/domain";
import { CategoryLabels, CategoryColors, RegionLabels } from "@/types/domain";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon issue
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// @ts-ignore
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Mock coordinates for regions (Austria)
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

// Add slight randomness to prevent overlapping markers
function getActivityCoordinates(activity: Activity): [number, number] {
  const base = regionCoordinates[activity.locationRegion] || [48.2, 14.5];
  const offset = () => (Math.random() - 0.5) * 0.3;
  return [base[0] + offset(), base[1] + offset()];
}

// Component to fit bounds
function FitBounds({ activities }: { activities: Activity[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (activities.length > 0) {
      const coords = activities.map(getActivityCoordinates);
      const bounds = new LatLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [activities, map]);
  
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
          eventHandlers={{
            click: () => onSelect(activity),
          }}
        />
      ))}
    </>
  );
}

export default function MapPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      const result = await getActivities();
      setActivities(result.data);
      setLoading(false);
    };
    fetchActivities();
  }, []);

  const activityMarkers = useMemo(() => {
    return activities.map((activity) => ({
      activity,
      position: getActivityCoordinates(activity),
    }));
  }, [activities]);

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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2"
        >
          <Card className="bg-card/60 border-border/50 rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="h-[600px] relative">
                <MapContainer
                  center={[47.5, 13.5]}
                  zoom={7}
                  className="h-full w-full rounded-2xl"
                  style={{ background: "hsl(var(--secondary))" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <FitBounds activities={activities} />
                  <MapMarkers 
                    activityMarkers={activityMarkers} 
                    onSelect={setSelectedActivity} 
                  />
                </MapContainer>
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
                      <span>{selectedActivity.duration}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button className="flex-1 rounded-xl gap-2" size="sm">
                      <ExternalLink className="h-4 w-4" />
                      Details
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
              <h3 className="font-semibold">
                {activities.length} Aktivitäten auf der Karte
              </h3>
              <div className="space-y-3 max-h-[540px] overflow-y-auto pr-2">
                {activities.map((activity, index) => (
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
                          <p className="text-xs text-muted-foreground">
                            {RegionLabels[activity.locationRegion]} · {activity.estPricePerPerson}€
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
