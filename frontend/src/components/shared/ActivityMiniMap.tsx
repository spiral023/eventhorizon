import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L, { Icon } from "leaflet";
import { Activity, RegionLabels } from "@/types/domain";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon
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

interface ActivityMiniMapProps {
  activity: Activity;
  className?: string;
}

function MapUpdater({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, 15); // Zoom level 15 for better precision
  }, [map, position]);
  return null;
}

export function ActivityMiniMap({ activity, className }: ActivityMiniMapProps) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const normalizeCoordinates = (coords: unknown): [number, number] | null => {
    if (!coords) return null;

    if (Array.isArray(coords) && coords.length === 2) {
      const [rawLat, rawLng] = coords as [number | string, number | string];
      const lat = typeof rawLat === "string" ? parseFloat(rawLat) : rawLat;
      const lng = typeof rawLng === "string" ? parseFloat(rawLng) : rawLng;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return [lat, lng];
      }
    }

    if (
      typeof coords === "object" &&
      coords !== null &&
      "lat" in coords &&
      "lng" in coords
    ) {
      const lat = parseFloat(String((coords as any).lat));
      const lng = parseFloat(String((coords as any).lng));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return [lat, lng];
      }
    }

    return null;
  };

  useEffect(() => {
    let isMounted = true;

    const resolvePosition = async () => {
      // 1. Prioritize explicit coordinates from the API (accept number or string inputs)
      const apiPosition =
        normalizeCoordinates(activity.coordinates) ||
        normalizeCoordinates((activity as any).locationCoordinates);

      if (apiPosition && isMounted) {
        setPosition(apiPosition);
        setLoading(false);
        setFailed(false);
        return;
      }

      console.log("ActivityMiniMap: No valid coordinates found, falling back to geocoding");

      // 2. Fallback to Geocoding
      const parts = [
        activity.locationAddress,
        activity.locationCity,
        RegionLabels[activity.locationRegion],
        "Austria",
      ].filter(Boolean);

      const query = parts.join(", ");
      
      if (!query) {
        if (isMounted) {
          setLoading(false);
          setFailed(true);
        }
        return;
      }

      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&addressdetails=0&limit=1&countrycodes=at`;

        const response = await fetch(url, {
          headers: {
            "Accept-Language": "de",
            "User-Agent": "eventhorizon-minimap/1.0",
          },
        });

        if (!response.ok) throw new Error("Geocoding failed");

        const data = await response.json();
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            const { lat, lon } = data[0];
            console.log("ActivityMiniMap: Geocoded position", [lat, lon]);
            setPosition([parseFloat(lat), parseFloat(lon)]);
            setFailed(false);
          } else {
            console.log("ActivityMiniMap: Geocoding found no results");
            setFailed(true);
          }
        }
      } catch (error) {
        console.warn("ActivityMiniMap: Geocoding error:", error);
        if (isMounted) setFailed(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    resolvePosition();

    return () => {
      isMounted = false;
    };
  }, [activity]);

  if (loading) {
    return (
      <div className={`bg-muted/30 animate-pulse rounded-lg flex items-center justify-center ${className}`} style={{ minHeight: "200px" }}>
        <span className="text-muted-foreground text-sm">Karte wird geladen...</span>
      </div>
    );
  }

  if (!position || failed) {
    return (
      <div className={`bg-muted/20 rounded-lg flex items-center justify-center text-muted-foreground text-sm ${className}`} style={{ minHeight: "200px" }}>
        Standort konnte nicht geladen werden.
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden border border-border/50 ${className}`}>
        <MapContainer
          key={`${position[0]}-${position[1]}`} // Force re-mount when position changes
          center={position}
          zoom={15}
          style={{ height: "100%", width: "100%", minHeight: "200px" }}
          scrollWheelZoom={false}
          dragging={!L.Browser.mobile} // Disable dragging on mobile to prevent page scroll hijack
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position} />
          <MapUpdater position={position} />
        </MapContainer>
    </div>
  );
}
