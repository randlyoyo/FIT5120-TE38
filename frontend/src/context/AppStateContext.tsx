import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  fetchHeatmap,
  fetchPredictiveAlerts,
  fetchQuietSpaces,
  fetchRoutes,
  fetchSensors,
} from "../services/api";
import type {
  HeatmapPoint,
  LatLon,
  PredictiveAlert,
  QuietSpace,
  RoutePlanResult,
  Sensor,
} from "../types";

const HEATMAP_REFRESH_MS = 60_000;
const PREDICTIVE_REFRESH_MS = 90_000;
// Matches the backend's cache TTL for /api/spaces and /api/spaces/sensors (cacheService.ts) -
// sensor/quiet-space markers were previously fetched once on mount and never refreshed, so any
// change to sensor status or landmark data server-side would silently never reach an
// already-open tab for the rest of the session.
const SENSORS_REFRESH_MS = 300_000;
const ROUTE_RECHECK_MS = 90_000; // US 1.3: re-check conditions along the active route periodically

export type PickMode = "start" | "end" | null;

interface AppState {
  sensors: Sensor[];
  quietSpaces: QuietSpace[];
  heatmapPoints: HeatmapPoint[];
  predictiveAlerts: PredictiveAlert[];
  initError: string | null;
  clearInitError: () => void;

  showHeatmap: boolean;
  setShowHeatmap: (v: boolean) => void;
  showSensors: boolean;
  setShowSensors: (v: boolean) => void;

  start: LatLon | null;
  end: LatLon | null;
  startLabel: string;
  endLabel: string;
  setStart: (point: LatLon | null, label?: string) => void;
  setEnd: (point: LatLon | null, label?: string) => void;
  pickMode: PickMode;
  setPickMode: (mode: PickMode) => void;
  handleMapPick: (point: LatLon) => void;

  routes: RoutePlanResult | null;
  planning: boolean;
  routeError: string | null;
  planRoute: () => Promise<void>;

  // US 1.3: while a route is active, we silently re-check conditions and offer a swap if
  // crowding along the current quietest route has gotten worse (or a clearly better
  // alternative appears) - never auto-swap the user's route out from under them.
  routeUpdateAvailable: RoutePlanResult | null;
  acceptRouteUpdate: () => void;
  dismissRouteUpdate: () => void;

  crowdAlertMessage: string | null;
  clearCrowdAlert: () => void;

  // Lets list rows (Busiest right now, Quiet Spaces) fly the map to a point without owning any
  // map/Leaflet code themselves - focusRequestId increments on every call so clicking the same
  // point twice in a row still re-triggers the fly-to (a plain LatLon object/value comparison
  // wouldn't, since the second click is a no-op change).
  focusPoint: LatLon | null;
  focusRequestId: number;
  // label is optional confirmation-toast text (e.g. a sensor/space name) - the row that
  // triggered this unmounts almost immediately once the panel switches to the Map tab, so the
  // toast lives in MapCanvas (which stays mounted) instead of on the row itself.
  focusOnPoint: (point: LatLon, label?: string) => void;
  focusToastMessage: string | null;
  clearFocusToast: () => void;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [quietSpaces, setQuietSpaces] = useState<QuietSpace[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [predictiveAlerts, setPredictiveAlerts] = useState<PredictiveAlert[]>([]);
  const [initError, setInitError] = useState<string | null>(null);

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showSensors, setShowSensors] = useState(true);

  const [start, setStartPoint] = useState<LatLon | null>(null);
  const [end, setEndPoint] = useState<LatLon | null>(null);
  const [startLabel, setStartLabel] = useState("");
  const [endLabel, setEndLabel] = useState("");
  const [pickMode, setPickMode] = useState<PickMode>(null);

  const [routes, setRoutes] = useState<RoutePlanResult | null>(null);
  const [planning, setPlanning] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeUpdateAvailable, setRouteUpdateAvailable] = useState<RoutePlanResult | null>(null);
  const [crowdAlertMessage, setCrowdAlertMessage] = useState<string | null>(null);
  const routesRef = useRef(routes);
  routesRef.current = routes;

  const [focusPoint, setFocusPoint] = useState<LatLon | null>(null);
  const [focusRequestId, setFocusRequestId] = useState(0);
  const [focusToastMessage, setFocusToastMessage] = useState<string | null>(null);
  const focusOnPoint = useCallback((point: LatLon, label?: string) => {
    setFocusPoint(point);
    setFocusRequestId((id) => id + 1);
    if (label) setFocusToastMessage(`Showing ${label} on the map`);
  }, []);

  // Each feed loads independently (not Promise.all) so one endpoint failing doesn't leave the
  // other two stuck at their empty initial state. Neon (see README) suspends the DB after a few
  // idle minutes, so the very first request after that can fail while it wakes up even though a
  // retry moments later succeeds - one retry after a short delay covers that case instead of
  // leaving the page empty until the next scheduled refresh (up to 5 minutes away) or a manual reload.
  useEffect(() => {
    let cancelled = false;

    function loadWithRetry<T>(fetcher: () => Promise<T>, setter: (v: T) => void) {
      fetcher()
        .then((data) => {
          if (!cancelled) setter(data);
        })
        .catch(() => {
          setTimeout(() => {
            if (cancelled) return;
            fetcher()
              .then((data) => {
                if (!cancelled) setter(data);
              })
              .catch((err) => {
                if (!cancelled) setInitError(`Failed to reach backend API: ${err.message}`);
              });
          }, 4000);
        });
    }

    loadWithRetry(fetchSensors, setSensors);
    loadWithRetry(fetchQuietSpaces, setQuietSpaces);
    loadWithRetry(fetchHeatmap, setHeatmapPoints);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      fetchHeatmap().then(setHeatmapPoints).catch(() => {});
    }, HEATMAP_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      fetchSensors().then(setSensors).catch(() => {});
      fetchQuietSpaces().then(setQuietSpaces).catch(() => {});
    }, SENSORS_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const load = () => fetchPredictiveAlerts().then(setPredictiveAlerts).catch(() => {});
    load();
    const id = setInterval(load, PREDICTIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const setStart = useCallback((point: LatLon | null, label = "") => {
    setStartPoint(point);
    setStartLabel(label);
  }, []);

  const setEnd = useCallback((point: LatLon | null, label = "") => {
    setEndPoint(point);
    setEndLabel(label);
  }, []);

  const handleMapPick = useCallback(
    (point: LatLon) => {
      if (pickMode === "start") {
        setStart(point);
        setPickMode(null);
      } else if (pickMode === "end") {
        setEnd(point);
        setPickMode(null);
      } else if (!start) {
        setStart(point);
      } else {
        setEnd(point);
      }
    },
    [pickMode, start, setStart, setEnd]
  );

  const planRoute = useCallback(async () => {
    if (!start || !end) return;
    setPlanning(true);
    setRouteError(null);
    setCrowdAlertMessage(null);
    setRouteUpdateAvailable(null);
    try {
      const result = await fetchRoutes(start, end);
      setRoutes(result);
      if (result.crowdAlert.triggered && result.crowdAlert.message) {
        setCrowdAlertMessage(result.crowdAlert.message);
      }
    } catch (err) {
      setRouteError((err as Error).message);
    } finally {
      setPlanning(false);
    }
  }, [start, end]);

  // En-route monitoring (US 1.3): while a route is active, periodically re-plan silently in the
  // background and flag it for the user if conditions along the current route got worse.
  useEffect(() => {
    if (!routes || !start || !end) return;

    const id = setInterval(async () => {
      const current = routesRef.current;
      if (!current) return;
      try {
        const candidate = await fetchRoutes(start, end);
        const gotMoreCrowded = candidate.crowdAlert.triggered && !current.crowdAlert.triggered;
        const flippedToHigh = candidate.quietest.sensoryLevel === "High" && current.quietest.sensoryLevel === "Low";
        const meaningfullyBetterPath =
          candidate.quietest.sensoryScore < current.quietest.sensoryScore * 0.85 &&
          Math.abs(candidate.quietest.distanceMeters - current.quietest.distanceMeters) > 30;

        if (gotMoreCrowded || flippedToHigh || meaningfullyBetterPath) {
          setRouteUpdateAvailable(candidate);
        }
      } catch {
        // silent - this is a background check, the user's current route is still shown
      }
    }, ROUTE_RECHECK_MS);

    return () => clearInterval(id);
  }, [routes !== null, start, end]);

  const acceptRouteUpdate = useCallback(() => {
    setRouteUpdateAvailable((pending) => {
      if (!pending) return null;
      setRoutes(pending);
      if (pending.crowdAlert.triggered && pending.crowdAlert.message) {
        setCrowdAlertMessage(pending.crowdAlert.message);
      }
      return null;
    });
  }, []);

  const dismissRouteUpdate = useCallback(() => setRouteUpdateAvailable(null), []);

  const value: AppState = {
    sensors,
    quietSpaces,
    heatmapPoints,
    predictiveAlerts,
    initError,
    clearInitError: () => setInitError(null),
    showHeatmap,
    setShowHeatmap,
    showSensors,
    setShowSensors,
    start,
    end,
    startLabel,
    endLabel,
    setStart,
    setEnd,
    pickMode,
    setPickMode,
    handleMapPick,
    routes,
    planning,
    routeError,
    planRoute,
    routeUpdateAvailable,
    acceptRouteUpdate,
    dismissRouteUpdate,
    crowdAlertMessage,
    clearCrowdAlert: () => setCrowdAlertMessage(null),
    focusPoint,
    focusRequestId,
    focusOnPoint,
    focusToastMessage,
    clearFocusToast: () => setFocusToastMessage(null),
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
