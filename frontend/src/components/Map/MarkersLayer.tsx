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

function findHeatmapPoint(heatmapPoints: HeatmapPoint[], sensor: Sensor): HeatmapPoint | undefined {
  return heatmapPoints.find((p) => p.locationId === sensor.locationId);
}

// No matching reading (sensor missing from /api/heatmap) is "unknown", not "worst case" -
// must not be conflated with a real high-intensity red reading.
function getSensorColor(point: HeatmapPoint | undefined): string {
  if (!point) return "#9ca3af";
  const intensity = point.intensity;
  if (intensity >= 0.75) return "#dc2626";
  if (intensity >= 0.45) return "#f59e0b";
  return "#16a34a";
}

// 说明.md: never present stale/estimated readings as if they were live.
function dataQualityText(point: HeatmapPoint | undefined): string {
  if (!point) return "";
  if (point.dataQuality === "live") return "";
  if (point.dataQuality === "stale") {
    const time = point.lastReadingTs
      ? new Date(point.lastReadingTs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "unknown";
    return ` (last updated ${time})`;
  }
  return " (estimated)";
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
          const point = findHeatmapPoint(heatmapPoints, s);
          const sensorIcon = createBadgeIcon(Radio, { background: getSensorColor(point), size: 26, iconSize: 13 });
          return (
            <Marker
              key={`sensor-${s.locationId}`}
              position={[s.latitude, s.longitude]}
              icon={sensorIcon}
              opacity={!point || point.dataQuality === "stale" ? 0.6 : 1}
            >
              <Popup>
                <strong>{s.sensorName}</strong>
                <br />
                Pedestrian count sensor
                <br />
                {point ? `${point.count} people/min${dataQualityText(point)}` : `Status: ${s.status}`}
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
