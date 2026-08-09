import axios from "axios";
import type {
  DualRouteResult,
  HeatmapPoint,
  LatLon,
  PredictiveAlert,
  QuietSpace,
  Sensor,
  SensitivityLevel,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

const client = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

export async function fetchQuietSpaces(): Promise<QuietSpace[]> {
  const { data } = await client.get<QuietSpace[]>("/spaces");
  return data;
}

export async function fetchSensors(): Promise<Sensor[]> {
  const { data } = await client.get<Sensor[]>("/spaces/sensors");
  return data;
}

export async function fetchHeatmap(): Promise<HeatmapPoint[]> {
  const { data } = await client.get<HeatmapPoint[]>("/heatmap");
  return data;
}

export async function fetchDualRoutes(
  start: LatLon,
  end: LatLon,
  sensitivity: SensitivityLevel
): Promise<DualRouteResult> {
  const { data } = await client.get<DualRouteResult>("/route", {
    params: {
      startLat: start.lat,
      startLon: start.lon,
      endLat: end.lat,
      endLon: end.lon,
      sensitivity,
    },
  });
  return data;
}

export async function fetchPredictiveAlerts(): Promise<PredictiveAlert[]> {
  const { data } = await client.get<PredictiveAlert[]>("/alerts/predictive");
  return data;
}
