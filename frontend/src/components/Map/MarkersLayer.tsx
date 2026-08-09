import { BookOpen, Image as ImageIcon, Radio, Trees } from "lucide-react";
import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import type { QuietSpace, Sensor } from "../../types";
import { createBadgeIcon } from "../../utils/mapIcons";

const THEME_ICON: Record<string, { icon: typeof Trees; color: string }> = {
  Library: { icon: BookOpen, color: "#2563eb" },
  Park: { icon: Trees, color: "#16a34a" },
  Gallery: { icon: ImageIcon, color: "#7c3aed" },
};

const sensorIcon = createBadgeIcon(Radio, { background: "#6b7280", size: 22, iconSize: 11 });

interface Props {
  sensors: Sensor[];
  quietSpaces: QuietSpace[];
  showSensors: boolean;
}

// Sensor points and quiet-space markers (spec 3.1, 3.4).
export function MarkersLayer({ sensors, quietSpaces, showSensors }: Props) {
  const quietSpaceIcons = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof createBadgeIcon>>();
    for (const theme of Object.keys(THEME_ICON)) {
      const { icon, color } = THEME_ICON[theme];
      cache.set(theme, createBadgeIcon(icon, { background: color }));
    }
    return cache;
  }, []);

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
