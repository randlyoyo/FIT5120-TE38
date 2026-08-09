export interface Sensor {
  locationId: number;
  sensorName: string;
  latitude: number;
  longitude: number;
  status: string;
}

export interface QuietSpace {
  id: number;
  featureName: string;
  theme: string;
  subTheme: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
}

export interface HeatmapPoint {
  lat: number;
  lon: number;
  count: number;
  intensity: number;
  sensorName: string;
  isHistorical: boolean;
}

export type SensoryLevel = "Low" | "High";

export interface SensorHotspot {
  locationId: number;
  sensorName: string;
  latitude: number;
  longitude: number;
  count: number;
  isHistorical: boolean;
}

export interface ScoredRoute {
  mode: "fastest" | "quietest";
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  sensoryScore: number;
  sensoryLevel: SensoryLevel;
  hotspots: SensorHotspot[];
}

export interface DualRouteResult {
  fastest: ScoredRoute;
  quietest: ScoredRoute;
  crowdAlert: { triggered: boolean; message?: string; hotspots: SensorHotspot[] };
  identicalPaths: boolean;
}

export interface PredictiveAlert {
  locationId: number;
  sensorName: string;
  latitude: number;
  longitude: number;
  currentCount: number;
  historicalMean: number;
  historicalStdDev: number;
  willBeBusy: boolean;
}

export interface LatLon {
  lat: number;
  lon: number;
}
