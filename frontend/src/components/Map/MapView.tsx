import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import type {
  DualRouteResult,
  HeatmapPoint,
  LatLon,
  PredictiveAlert,
  QuietSpace,
  Sensor,
} from "../../types";
import { HeatmapLayer } from "./HeatmapLayer";
import { MarkersLayer } from "./MarkersLayer";
import { RouteLayer } from "./RouteLayer";

export const MELBOURNE_CBD_CENTER: [number, number] = [-37.8136, 144.9631];

const startIcon = new L.DivIcon({ html: "🟢", className: "endpoint-icon", iconSize: [24, 24] });
const endIcon = new L.DivIcon({ html: "🔴", className: "endpoint-icon", iconSize: [24, 24] });

function ClickToSetPoint({ onPick }: { onPick: (point: LatLon) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return null;
}

const predictiveIcon = new L.DivIcon({
  html: "🔶",
  className: "predictive-icon pulse",
  iconSize: [22, 22],
});

interface Props {
  sensors: Sensor[];
  quietSpaces: QuietSpace[];
  heatmapPoints: HeatmapPoint[];
  showHeatmap: boolean;
  showSensors: boolean;
  start: LatLon | null;
  end: LatLon | null;
  onPickPoint: (point: LatLon) => void;
  routes: DualRouteResult | null;
  predictiveAlerts: PredictiveAlert[];
}

// Map container: base tiles, sensor/quiet-space markers, heatmap toggle, dual routes (spec 3.1-3.4).
export function MapView({
  sensors,
  quietSpaces,
  heatmapPoints,
  showHeatmap,
  showSensors,
  start,
  end,
  onPickPoint,
  routes,
  predictiveAlerts,
}: Props) {
  return (
    <MapContainer center={MELBOURNE_CBD_CENTER} zoom={15} className="map-container">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickToSetPoint onPick={onPickPoint} />

      <MarkersLayer sensors={sensors} quietSpaces={quietSpaces} showSensors={showSensors} />
      <HeatmapLayer points={heatmapPoints} visible={showHeatmap} />
      <RouteLayer routes={routes} />

      {predictiveAlerts.map((a) => (
        <Marker key={`predictive-${a.locationId}`} position={[a.latitude, a.longitude]} icon={predictiveIcon}>
          <Popup>
            <strong>{a.sensorName}</strong>
            <br />
            预计未来 1 小时将变拥挤 / Expected to get busy within the hour
            <br />
            Current {a.currentCount} vs. usual {a.historicalMean} (±{a.historicalStdDev})
          </Popup>
        </Marker>
      ))}

      {start && (
        <Marker position={[start.lat, start.lon]} icon={startIcon}>
        </Marker>
      )}
      {end && (
        <Marker position={[end.lat, end.lon]} icon={endIcon}>
        </Marker>
      )}
    </MapContainer>
  );
}
