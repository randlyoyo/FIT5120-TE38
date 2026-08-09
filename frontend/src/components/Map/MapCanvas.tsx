import { ChevronRight, Flame, Radio, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../../context/AppStateContext";
import { AlertBanner } from "../Controls/AlertBanner";
import { MapView } from "./MapView";

// Persistent map layer shown behind every panel (mobile: full-screen on the Map tab and hidden
// elsewhere via CSS; desktop: always visible next to the docked side panel, like a real map app).
export function MapCanvas() {
  const { showHeatmap, setShowHeatmap, showSensors, setShowSensors, routes, crowdAlertMessage, clearCrowdAlert } = useAppState();
  const navigate = useNavigate();

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
          <span>
            Quietest route — {(routes.quietest.distanceMeters / 1000).toFixed(2)} km, {Math.round(routes.quietest.durationSeconds / 60)} min
          </span>
          <ChevronRight size={16} className="route-mini-card-arrow" />
        </button>
      )}

      <AlertBanner message={crowdAlertMessage} tone="warning" onDismiss={clearCrowdAlert} />
    </div>
  );
}
