import { LocateFixed, MapPin, TrendingUp } from "lucide-react";
import { useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import { useAppState } from "../../context/AppStateContext";
import type { LatLon } from "../../types";
import { createBadgeIcon, createDotIcon, createPinIcon } from "../../utils/mapIcons";
import { MarkersLayer } from "./MarkersLayer";
import { RouteLayer } from "./RouteLayer";
import { SensoryFieldLayer } from "./SensoryFieldLayer";

export const MELBOURNE_CBD_CENTER: [number, number] = [-37.8136, 144.9631];

const startIcon = createDotIcon("#2563eb");
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
function RecenterControl() {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  function handleClick() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 16);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <button className="map-recenter-btn" onClick={handleClick} disabled={locating} aria-label="Centre on my location">
      <LocateFixed size={18} className={locating ? "spin-slow" : ""} />
    </button>
  );
}

// Map container: base tiles, sensor/quiet-space markers, heatmap field, dual routes (spec 3.1-3.4).
export function MapView() {
  const { sensors, quietSpaces, heatmapPoints, showHeatmap, showSensors, start, end, handleMapPick, routes, predictiveAlerts } =
    useAppState();

  return (
    <MapContainer center={MELBOURNE_CBD_CENTER} zoom={15} className="map-container" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ZoomControl position="bottomright" />
      <ClickToSetPoint onPick={handleMapPick} />
      <RecenterControl />

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

      {start && <Marker position={[start.lat, start.lon]} icon={startIcon} />}
      {end && <Marker position={[end.lat, end.lon]} icon={endIcon} />}
    </MapContainer>
  );
}
