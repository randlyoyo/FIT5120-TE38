import { TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { PanelHeader } from "../components/Layout/PanelHeader";
import { useAppState } from "../context/AppStateContext";

function severityClass(intensity: number): string {
  if (intensity > 0.6) return "red";
  if (intensity > 0.3) return "orange";
  return "green";
}

// 说明.md: live -> show as-is, stale -> grey + "last updated HH:MM", no_live_data -> "estimated" -
// never present a stale/estimated reading as if it were live.
function dataQualityLabel(dataQuality: "live" | "stale" | "no_live_data", lastReadingTs: string | null): string {
  if (dataQuality === "live") return "(latest reading)";
  if (dataQuality === "stale") {
    const time = lastReadingTs
      ? new Date(lastReadingTs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "unknown";
    return `(last updated ${time})`;
  }
  return "(estimated)";
}

// Alerts tab (spec 3.5, 3.6): a list-based, non-visual alternative to the map's colour coding -
// current busiest spots and predictive "will get busy soon" alerts.
export function AlertsPage() {
  const { predictiveAlerts, heatmapPoints } = useAppState();

  const busiestNow = useMemo(
    () => [...heatmapPoints].sort((a, b) => b.count - a.count).slice(0, 8),
    [heatmapPoints]
  );

  return (
    <div className="page page-list">
      <PanelHeader title="Alerts" />

      <section>
        <h3 className="section-title">Predicted to get busy</h3>
        {predictiveAlerts.length === 0 ? (
          <p className="hint">No predicted crowding right now.</p>
        ) : (
          <ul className="place-list">
            {predictiveAlerts.map((a) => (
              <li key={a.locationId} className="place-list-item">
                <span className="place-list-icon">
                  <TrendingUp size={18} color="#f97316" />
                </span>
                <div className="place-list-body">
                  <div className="place-list-title">{a.sensorName}</div>
                  <div className="place-list-sub">
                    Usually {a.currentTypicalCount}/hr now, expected ~{a.nextHourExpectedCount}/hr within the hour
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="section-title">Busiest right now</h3>
        <ul className="place-list">
          {busiestNow.map((p) => (
            <li
              key={p.sensorName}
              className={`place-list-item${p.dataQuality === "stale" ? " place-list-item-muted" : ""}`}
            >
              <span className={`severity-dot ${severityClass(p.intensity)}`} />
              <div className="place-list-body">
                <div className="place-list-title">{p.sensorName}</div>
                <div className="place-list-sub">
                  {p.count} pedestrians {dataQualityLabel(p.dataQuality, p.lastReadingTs)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
