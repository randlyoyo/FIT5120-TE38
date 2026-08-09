import { useState } from "react";
import { geocodeAddress } from "../../services/geocode";
import type { DualRouteResult, LatLon } from "../../types";
import { LoadingSpinner } from "../common/LoadingSpinner";

export type PickMode = "start" | "end" | null;

interface Props {
  start: LatLon | null;
  end: LatLon | null;
  pickMode: PickMode;
  onPickModeChange: (mode: PickMode) => void;
  onSetStart: (point: LatLon | null) => void;
  onSetEnd: (point: LatLon | null) => void;
  onPlan: () => void;
  planning: boolean;
  routes: DualRouteResult | null;
  error: string | null;
}

// A/B input + "plan route" trigger, and the dual-route result summary (spec 3.1, 3.3).
export function RoutePanel({
  start,
  end,
  pickMode,
  onPickModeChange,
  onSetStart,
  onSetEnd,
  onPlan,
  planning,
  routes,
  error,
}: Props) {
  const [startText, setStartText] = useState("");
  const [endText, setEndText] = useState("");
  const [geocoding, setGeocoding] = useState<"start" | "end" | null>(null);

  async function handleGeocode(which: "start" | "end") {
    const query = which === "start" ? startText : endText;
    if (!query.trim()) return;
    setGeocoding(which);
    try {
      const point = await geocodeAddress(query);
      if (!point) {
        window.alert(`Address not found in Melbourne CBD: "${query}"`);
        return;
      }
      if (which === "start") onSetStart(point);
      else onSetEnd(point);
    } finally {
      setGeocoding(null);
    }
  }

  return (
    <div className="route-panel">
      <h2>Plan a route</h2>
      <p className="hint">Type an address, or click "Pick on map" then click a point on the map.</p>

      <div className="input-row">
        <label>A · Start</label>
        <input
          value={startText}
          placeholder={start ? `${start.lat.toFixed(4)}, ${start.lon.toFixed(4)}` : "e.g. Flinders Street Station"}
          onChange={(e) => setStartText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGeocode("start")}
        />
        <button onClick={() => handleGeocode("start")} disabled={geocoding === "start"}>
          {geocoding === "start" ? "…" : "Go"}
        </button>
        <button
          className={pickMode === "start" ? "active" : ""}
          onClick={() => onPickModeChange(pickMode === "start" ? null : "start")}
        >
          📍
        </button>
      </div>

      <div className="input-row">
        <label>B · End</label>
        <input
          value={endText}
          placeholder={end ? `${end.lat.toFixed(4)}, ${end.lon.toFixed(4)}` : "e.g. State Library Victoria"}
          onChange={(e) => setEndText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGeocode("end")}
        />
        <button onClick={() => handleGeocode("end")} disabled={geocoding === "end"}>
          {geocoding === "end" ? "…" : "Go"}
        </button>
        <button
          className={pickMode === "end" ? "active" : ""}
          onClick={() => onPickModeChange(pickMode === "end" ? null : "end")}
        >
          📍
        </button>
      </div>

      {pickMode && <p className="hint pick-mode-hint">Click the map to set the {pickMode} point.</p>}

      <button className="plan-button" onClick={onPlan} disabled={!start || !end || planning}>
        {planning ? "Planning…" : "规划路线 / Plan route"}
      </button>

      {planning && <LoadingSpinner label="Calculating fastest & quietest routes…" />}
      {error && <p className="error-text">{error}</p>}

      {routes && (
        <div className="route-summary">
          <div className="route-summary-row fastest">
            <span className="dot blue" /> Fastest — {(routes.fastest.distanceMeters / 1000).toFixed(2)} km,{" "}
            {Math.round(routes.fastest.durationSeconds / 60)} min
          </div>
          <div className="route-summary-row quietest">
            <span className={`dot ${routes.quietest.sensoryLevel === "High" ? "orange" : "green"}`} /> Quietest —{" "}
            {(routes.quietest.distanceMeters / 1000).toFixed(2)} km,{" "}
            {Math.round(routes.quietest.durationSeconds / 60)} min ·{" "}
            <strong>{routes.quietest.sensoryLevel} sensory load</strong>
          </div>
          {routes.identicalPaths && (
            <p className="hint">No quieter alternative found for this trip — showing the same path.</p>
          )}
        </div>
      )}
    </div>
  );
}
