import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { AlertBanner } from "./components/Controls/AlertBanner";
import { NoiseSwitch } from "./components/Controls/NoiseSwitch";
import { PickMode, RoutePanel } from "./components/Controls/RoutePanel";
import { MapView } from "./components/Map/MapView";
import {
  fetchDualRoutes,
  fetchHeatmap,
  fetchPredictiveAlerts,
  fetchQuietSpaces,
  fetchSensors,
} from "./services/api";
import type { DualRouteResult, HeatmapPoint, LatLon, PredictiveAlert, QuietSpace, Sensor } from "./types";

const HEATMAP_REFRESH_MS = 60_000;
const PREDICTIVE_REFRESH_MS = 90_000;

export default function App() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [quietSpaces, setQuietSpaces] = useState<QuietSpace[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [predictiveAlerts, setPredictiveAlerts] = useState<PredictiveAlert[]>([]);

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showSensors, setShowSensors] = useState(false);

  const [start, setStart] = useState<LatLon | null>(null);
  const [end, setEnd] = useState<LatLon | null>(null);
  const [pickMode, setPickMode] = useState<PickMode>(null);

  const [routes, setRoutes] = useState<DualRouteResult | null>(null);
  const [planning, setPlanning] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [crowdAlertMessage, setCrowdAlertMessage] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchSensors(), fetchQuietSpaces(), fetchHeatmap()])
      .then(([s, q, h]) => {
        setSensors(s);
        setQuietSpaces(q);
        setHeatmapPoints(h);
      })
      .catch((err) => setInitError(`Failed to reach backend API: ${err.message}`));
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      fetchHeatmap().then(setHeatmapPoints).catch(() => {});
    }, HEATMAP_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const load = () => fetchPredictiveAlerts().then(setPredictiveAlerts).catch(() => {});
    load();
    const id = setInterval(load, PREDICTIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const handlePickPoint = useCallback(
    (point: LatLon) => {
      if (pickMode === "start") {
        setStart(point);
        setPickMode(null);
      } else if (pickMode === "end") {
        setEnd(point);
        setPickMode(null);
      } else if (!start) {
        setStart(point);
      } else if (!end) {
        setEnd(point);
      } else {
        setEnd(point);
      }
    },
    [pickMode, start, end]
  );

  async function handlePlan() {
    if (!start || !end) return;
    setPlanning(true);
    setRouteError(null);
    setCrowdAlertMessage(null);
    try {
      const result = await fetchDualRoutes(start, end);
      setRoutes(result);
      if (result.crowdAlert.triggered && result.crowdAlert.message) {
        setCrowdAlertMessage(result.crowdAlert.message);
      }
    } catch (err) {
      setRouteError((err as Error).message);
    } finally {
      setPlanning(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <header>
          <h1>🧭 Sensory-Aware Navigation</h1>
          <p className="subtitle">Melbourne CBD · FIT5120 Onboarding Iteration</p>
        </header>

        {initError && <p className="error-text">{initError}</p>}

        <NoiseSwitch checked={showHeatmap} onChange={setShowHeatmap} label="行人密度热力图 Heatmap" />
        <NoiseSwitch checked={showSensors} onChange={setShowSensors} label="显示传感器 Sensors" />

        <RoutePanel
          start={start}
          end={end}
          pickMode={pickMode}
          onPickModeChange={setPickMode}
          onSetStart={setStart}
          onSetEnd={setEnd}
          onPlan={handlePlan}
          planning={planning}
          routes={routes}
          error={routeError}
        />

        <footer className="legend">
          <div>🍃 Quiet space · 📚 Library · 🎨 Gallery</div>
          <div>📡 Sensor · 🔶 Predicted to get busy</div>
        </footer>
      </aside>

      <main className="map-area">
        <MapView
          sensors={sensors}
          quietSpaces={quietSpaces}
          heatmapPoints={heatmapPoints}
          showHeatmap={showHeatmap}
          showSensors={showSensors}
          start={start}
          end={end}
          onPickPoint={handlePickPoint}
          routes={routes}
          predictiveAlerts={predictiveAlerts}
        />
        <AlertBanner message={crowdAlertMessage} tone="warning" onDismiss={() => setCrowdAlertMessage(null)} />
      </main>
    </div>
  );
}
