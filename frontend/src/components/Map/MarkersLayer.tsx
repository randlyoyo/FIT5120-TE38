import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import type { QuietSpace, Sensor } from "../../types";

const quietSpaceIcon = new L.DivIcon({
  html: "🍃",
  className: "quiet-space-icon",
  iconSize: [26, 26],
});

const sensorIcon = new L.DivIcon({
  html: "📡",
  className: "sensor-icon",
  iconSize: [20, 20],
});

const themeEmoji: Record<string, string> = {
  Library: "📚",
  Park: "🍃",
  Gallery: "🎨",
};

interface Props {
  sensors: Sensor[];
  quietSpaces: QuietSpace[];
  showSensors: boolean;
}

// Sensor points and quiet-space markers (spec 3.1, 3.4).
export function MarkersLayer({ sensors, quietSpaces, showSensors }: Props) {
  return (
    <>
      {showSensors &&
        sensors.map((s) => (
          <Marker key={`sensor-${s.locationId}`} position={[s.latitude, s.longitude]} icon={sensorIcon}>
            <Popup>
              <strong>{s.sensorName}</strong>
              <br />
              Pedestrian sensor
            </Popup>
          </Marker>
        ))}

      {quietSpaces.map((q) => (
        <Marker
          key={`quiet-${q.id}`}
          position={[q.latitude, q.longitude]}
          icon={
            new L.DivIcon({
              html: themeEmoji[q.theme] ?? "🍃",
              className: "quiet-space-icon",
              iconSize: [26, 26],
            })
          }
        >
          <Popup>
            <strong>{q.featureName}</strong>
            <br />
            {q.theme}
            {q.subTheme ? ` · ${q.subTheme}` : ""}
            <br />
            {q.address ?? ""}
          </Popup>
        </Marker>
      ))}
    </>
  );
}
