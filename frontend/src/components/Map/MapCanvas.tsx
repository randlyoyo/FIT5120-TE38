import { ChevronRight, Flame, Radio, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppState } from "../../context/AppStateContext";
import { AlertBanner } from "../Controls/AlertBanner";
import { NoiseBadge } from "../Controls/NoiseBadge";
import { MapView } from "./MapView";

// Persistent map layer shown behind every panel (mobile: full-screen on the Map tab and hidden
// elsewhere via CSS; desktop: always visible next to the docked side panel, like a real map app).
export function MapCanvas() {
  const { showHeatmap, setShowHeatmap, showSensors, setShowSensors, routes, crowdAlertMessage, clearCrowdAlert, pickMode } =
    useAppState();
  const navigate = useNavigate();
  const location = useLocation();

  // On mobile, picking a point briefly swaps to the map (the Navigate panel is a full-screen
  // overlay there, so there's no other way to see it to tap) - once the pick lands (pickMode
  // goes back to null), jump straight back to the Navigate panel instead of stranding the user
  // on an empty map tab.
  const prevPickMode = useRef(pickMode);
  useEffect(() => {
    if (prevPickMode.current && !pickMode && location.pathname === "/") {
      navigate("/navigate");
    }
    prevPickMode.current = pickMode;
  }, [pickMode, location.pathname, navigate]);

  return (
    <div className="map-canvas">
      <MapView />

      <button className="map-search-bar" onClick={() => navigate("/navigate")}>
        <Search size={16} />
        <span>Search for a place</span>
      </button>

      <div className="map-fabs">
        <button
          className={`fab ${showHeatmap ? "on" : ""}`}
          onClick={() => setShowHeatmap(!showHeatmap)}
          title="Toggle pedestrian-density heatmap"
          aria-label="Toggle heatmap"
        >
          <Flame size={18} />
        </button>
        <button
          className={`fab ${showSensors ? "on" : ""}`}
          onClick={() => setShowSensors(!showSensors)}
          title="Toggle sensor markers"
          aria-label="Toggle sensors"
        >
          <Radio size={18} />
        </button>
      </div>

      {routes && (
        <button className="route-mini-card" onClick={() => navigate("/navigate")}>
          <span className={`dot ${routes.quietest.sensoryLevel === "High" ? "orange" : "green"}`} />
          <span className="route-tab-label">
            Quietest route — {(routes.quietest.distanceMeters / 1000).toFixed(2)} km, {Math.round(routes.quietest.durationSeconds / 60)} min
          </span>
          <NoiseBadge noiseScore={routes.quietest.noiseScore} />
          <ChevronRight size={16} className="route-mini-card-arrow" />
        </button>
      )}

      <AlertBanner message={crowdAlertMessage} tone="warning" onDismiss={clearCrowdAlert} />
    </div>
  );
}
