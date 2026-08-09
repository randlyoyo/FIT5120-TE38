import { AlertCircle, LocateFixed, MapPinPlus, Navigation } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../../context/AppStateContext";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { DirectionsList } from "./DirectionsList";
import { PlaceAutocomplete } from "./PlaceAutocomplete";
import { SensitivitySelector } from "./SensitivitySelector";

// Search-based A/B navigation panel (spec 3.1, 3.3): type-ahead place search like a real map
// app, "use my location", plan trigger, and turn-by-turn directions for the chosen route.
export function RoutePanel() {
  const {
    start,
    end,
    startLabel,
    endLabel,
    setStart,
    setEnd,
    pickMode,
    setPickMode,
    planRoute,
    planning,
    routes,
    routeError,
    routeUpdateAvailable,
    acceptRouteUpdate,
    dismissRouteUpdate,
  } = useAppState();
  const navigate = useNavigate();

  const [startText, setStartText] = useState(startLabel);
  const [endText, setEndText] = useState(endLabel);
  const [locating, setLocating] = useState(false);
  const [activeDirections, setActiveDirections] = useState<"fastest" | "quietest">("quietest");

  function togglePick(which: "start" | "end") {
    const next = pickMode === which ? null : which;
    setPickMode(next);
    if (next) navigate("/"); // switch to the map so the user can tap a point
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      window.alert("Geolocation is not supported in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStart({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setStartText("My current location");
        setLocating(false);
      },
      () => {
        window.alert("Couldn't get your location - check browser permissions.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="route-panel">
      <SensitivitySelector />

      <p className="hint">Search for a place, use your location, or pick a point on the map.</p>

      <div className="input-row">
        <label>A</label>
        <PlaceAutocomplete
          value={startText}
          onChange={setStartText}
          onSelect={(point, label) => {
            setStart(point, label);
            setStartText(label);
          }}
          placeholder={start ? `${start.lat.toFixed(4)}, ${start.lon.toFixed(4)}` : "Search start point…"}
        />
        <button onClick={useCurrentLocation} disabled={locating} title="Use my current location" aria-label="Use my current location">
          <LocateFixed size={16} className={locating ? "spin-slow" : ""} />
        </button>
        <button
          className={pickMode === "start" ? "active" : ""}
          onClick={() => togglePick("start")}
          title="Pick on map"
          aria-label="Pick start on map"
        >
          <MapPinPlus size={16} />
        </button>
      </div>

      <div className="input-row">
        <label>B</label>
        <PlaceAutocomplete
          value={endText}
          onChange={setEndText}
          onSelect={(point, label) => {
            setEnd(point, label);
            setEndText(label);
          }}
          placeholder={end ? `${end.lat.toFixed(4)}, ${end.lon.toFixed(4)}` : "Search destination…"}
        />
        <button
          className={pickMode === "end" ? "active" : ""}
          onClick={() => togglePick("end")}
          title="Pick on map"
          aria-label="Pick destination on map"
        >
          <MapPinPlus size={16} />
        </button>
      </div>

      {pickMode && <p className="hint pick-mode-hint">Switch to the Map tab and tap to set the {pickMode} point.</p>}

      <button className="plan-button" onClick={planRoute} disabled={!start || !end || planning}>
        <Navigation size={16} />
        {planning ? "Planning…" : "Navigate"}
      </button>

      {planning && <LoadingSpinner label="Calculating fastest & quietest routes…" />}
      {routeError && <p className="error-text">{routeError}</p>}

      {routeUpdateAvailable && (
        <div className="route-update-banner">
          <AlertCircle size={16} />
          <div className="route-update-text">
            <strong>Conditions along your route have changed.</strong>
            <span>
              Updated quietest route: {(routeUpdateAvailable.quietest.distanceMeters / 1000).toFixed(2)} km,{" "}
              {Math.round(routeUpdateAvailable.quietest.durationSeconds / 60)} min ·{" "}
              {routeUpdateAvailable.quietest.sensoryLevel} sensory load
            </span>
          </div>
          <div className="route-update-actions">
            <button className="secondary-button small text" onClick={acceptRouteUpdate}>
              Update
            </button>
            <button className="secondary-button small text ghost" onClick={dismissRouteUpdate}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {routes && (
        <div className="route-summary">
          <button
            className={`route-tab fastest ${activeDirections === "fastest" ? "selected" : ""}`}
            onClick={() => setActiveDirections("fastest")}
          >
            <span className="dot blue" /> Fastest — {(routes.fastest.distanceMeters / 1000).toFixed(2)} km,{" "}
            {Math.round(routes.fastest.durationSeconds / 60)} min
          </button>
          <button
            className={`route-tab quietest ${activeDirections === "quietest" ? "selected" : ""}`}
            onClick={() => setActiveDirections("quietest")}
          >
            <span className={`dot ${routes.quietest.sensoryLevel === "High" ? "orange" : "green"}`} /> Quietest —{" "}
            {(routes.quietest.distanceMeters / 1000).toFixed(2)} km,{" "}
            {Math.round(routes.quietest.durationSeconds / 60)} min · <strong>{routes.quietest.sensoryLevel} sensory load</strong>
          </button>
          {routes.identicalPaths && <p className="hint">No quieter alternative found for this trip — showing the same path.</p>}

          <DirectionsList steps={routes[activeDirections].steps} />
        </div>
      )}
    </div>
  );
}
