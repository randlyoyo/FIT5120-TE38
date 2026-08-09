import { BookOpen, Image as ImageIcon, Radio, Trees } from "lucide-react";
import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import type { HeatmapPoint, QuietSpace, Sensor } from "../../types";
import { createBadgeIcon } from "../../utils/mapIcons";

const THEME_ICON: Record<string, { icon: typeof Trees; color: string }> = {
  Library: { icon: BookOpen, color: "#2563eb" },
  Park: { icon: Trees, color: "#16a34a" },
  Gallery: { icon: ImageIcon, color: "#7c3aed" },
};

interface Props {
  sensors: Sensor[];
  quietSpaces: QuietSpace[];
  showSensors: boolean;
  heatmapPoints?: HeatmapPoint[];
}

function getSensorColor(heatmapPoints: HeatmapPoint[], sensor: Sensor): string {
  const point = heatmapPoints.find((p) => Math.abs(p.lat - sensor.latitude) < 0.0005 && Math.abs(p.lon - sensor.longitude) < 0.0005);
  if (!point) return "#dc2626";

  const intensity = point.intensity;
  if (intensity >= 0.75) return "#dc2626";
  if (intensity >= 0.45) return "#f59e0b";
  return "#16a34a";
}

// Sensor points and quiet-space markers (spec 3.1, 3.4).
export function MarkersLayer({ sensors, quietSpaces, showSensors, heatmapPoints = [] }: Props) {
  const quietSpaceIcons = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof createBadgeIcon>>();
    for (const theme of Object.keys(THEME_ICON)) {
      const { icon, color } = THEME_ICON[theme];
      cache.set(theme, createBadgeIcon(icon, { background: color, size: 30, iconSize: 15 }));
    }
    return cache;
  }, []);

  return (
    <>
      {showSensors &&
        sensors.map((s) => {
          const sensorIcon = createBadgeIcon(Radio, { background: getSensorColor(heatmapPoints, s), size: 26, iconSize: 13 });
          return (
            <Marker key={`sensor-${s.locationId}`} position={[s.latitude, s.longitude]} icon={sensorIcon}>
              <Popup>
                <strong>{s.sensorName}</strong>
                <br />
                Pedestrian count sensor
                <br />
                Status: {s.status}
              </Popup>
            </Marker>
          );
        })}

      {quietSpaces.map((q) => (
        <Marker
          key={`quiet-${q.id}`}
          position={[q.latitude, q.longitude]}
          icon={quietSpaceIcons.get(q.theme) ?? createBadgeIcon(Trees, { background: "#16a34a" })}
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
