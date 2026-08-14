import axios from "axios";
import type {
  HeatmapPoint,
  LatLon,
  PredictiveAlert,
  QuietSpace,
  RoutePlanResult,
  Sensor,
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

export async function fetchRoutes(start: LatLon, end: LatLon): Promise<RoutePlanResult> {
  const { data } = await client.get<RoutePlanResult>("/route", {
    params: {
      startLat: start.lat,
      startLon: start.lon,
      endLat: end.lat,
      endLon: end.lon,
    },
  });
  return data;
}

export async function fetchPredictiveAlerts(): Promise<PredictiveAlert[]> {
  const { data } = await client.get<PredictiveAlert[]>("/alerts/predictive");
  return data;
}
