import { TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { PanelHeader } from "../components/Layout/PanelHeader";
import { useAppState } from "../context/AppStateContext";

function severityClass(intensity: number): string {
  if (intensity > 0.6) return "red";
  if (intensity > 0.3) return "orange";
  return "green";
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
                    Current {a.currentCount} vs. usual {a.historicalMean} (±{a.historicalStdDev})
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
            <li key={p.sensorName} className="place-list-item">
              <span className={`severity-dot ${severityClass(p.intensity)}`} />
              <div className="place-list-body">
                <div className="place-list-title">{p.sensorName}</div>
                <div className="place-list-sub">
                  {p.count} pedestrians {p.isHistorical ? "(historical avg.)" : "(latest reading)"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
