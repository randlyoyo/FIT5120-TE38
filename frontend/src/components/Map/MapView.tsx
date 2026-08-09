import { LocateFixed, MapPin, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import { useAppState } from "../../context/AppStateContext";
import type { LatLon } from "../../types";
import { createBadgeIcon, createDotIcon, createPinIcon } from "../../utils/mapIcons";
import { MarkersLayer } from "./MarkersLayer";
import { RouteLayer } from "./RouteLayer";
import { SensoryFieldLayer } from "./SensoryFieldLayer";

export const MELBOURNE_CBD_CENTER: [number, number] = [-37.8136, 144.9631];

const startIcon = createDotIcon("#6b7280");
const endIcon = createPinIcon(MapPin, "#dc2626");
const predictiveIcon = createBadgeIcon(TrendingUp, { background: "#f97316", pulse: true });

function ClickToSetPoint({ onPick }: { onPick: (point: LatLon) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return null;
}

// Recenters the map on the browser's geolocation - a standalone "where am I" control,
// distinct from the Navigate panel's "use my location as start point" action.
function RecenterControl({ userLocation }: { userLocation: UserLocationState | null }) {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  function handleClick() {
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lon], 18);
      return;
    }

    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 18);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }

  return (
    <button className="map-recenter-btn" onClick={handleClick} disabled={locating} aria-label="Centre on my location">
      <LocateFixed size={18} className={locating ? "spin-slow" : ""} />
    </button>
  );
}

type UserLocationState = {
  lat: number;
  lon: number;
  accuracy: number;
};

// Map container: base tiles, sensor/quiet-space markers, heatmap field, dual routes (spec 3.1-3.4).
export function MapView() {
  const { sensors, quietSpaces, heatmapPoints, showHeatmap, showSensors, start, end, handleMapPick, routes, predictiveAlerts } =
    useAppState();
  const [userLocation, setUserLocation] = useState<UserLocationState | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? 100,
        });
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <MapContainer center={MELBOURNE_CBD_CENTER} zoom={15} className="map-container" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ZoomControl position="bottomright" />
      <ClickToSetPoint onPick={handleMapPick} />
      <RecenterControl userLocation={userLocation} />

      <MarkersLayer sensors={sensors} quietSpaces={quietSpaces} showSensors={showSensors} />
      <SensoryFieldLayer points={heatmapPoints} visible={showHeatmap} />
      <RouteLayer routes={routes} />

      {predictiveAlerts.map((a) => (
        <Marker key={`predictive-${a.locationId}`} position={[a.latitude, a.longitude]} icon={predictiveIcon}>
          <Popup>
            <strong>{a.sensorName}</strong>
            <br />
            Expected to get busy within the hour
            <br />
            Current {a.currentCount} vs. usual {a.historicalMean} (±{a.historicalStdDev})
          </Popup>
        </Marker>
      ))}

      {userLocation && (
        <>
          <Circle
            center={[userLocation.lat, userLocation.lon]}
            radius={Math.max(15, Math.min(userLocation.accuracy, 120))}
            pathOptions={{ color: "#60a5fa", fillColor: "#60a5fa", fillOpacity: 0.12, weight: 1 }}
          />
          <CircleMarker
            center={[userLocation.lat, userLocation.lon]}
            radius={10}
            pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.95, weight: 3 }}
          />
        </>
      )}

      {start && <Marker position={[start.lat, start.lon]} icon={startIcon} />}
      {end && <Marker position={[end.lat, end.lon]} icon={endIcon} />}
    </MapContainer>
  );
}
