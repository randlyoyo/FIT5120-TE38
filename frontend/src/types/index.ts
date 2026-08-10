// Mirrors the team DB's v_current_crowding.data_quality (说明.md):
// live -> show as-is, stale -> grey out + "last updated HH:MM", no_live_data -> label "estimated".
export type DataQuality = "live" | "stale" | "no_live_data";

export interface Sensor {
  locationId: number;
  sensorName: string;
  sensorDescription: string | null;
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
  locationId: number;
  lat: number;
  lon: number;
  count: number;
  intensity: number;
  sensorName: string;
  sensoryLoad: number;
  crowdLevel: "low" | "medium" | "high";
  dataQuality: DataQuality;
  lastReadingTs: string | null;
}

export type SensoryLevel = "Low" | "High";

export interface SensorHotspot {
  locationId: number;
  sensorName: string;
  latitude: number;
  longitude: number;
  count: number;
  sensoryLoad: number;
  crowdLevel: "low" | "medium" | "high";
  dataQuality: DataQuality;
}

export interface NavigationStep {
  instruction: string;
  streetName: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuverType: string;
  modifier: string | null;
  location: [number, number];
}

export interface ScoredRoute {
  mode: "fastest" | "quietest";
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  sensoryScore: number;
  sensoryLevel: SensoryLevel;
  // sensoryScore as a % of the user's sensitivity threshold - 100 = right at their "High" cutoff.
  // Uncapped, so two "High" routes stay distinguishable (e.g. 240 vs 110).
  noiseScore: number;
  hotspots: SensorHotspot[];
  steps: NavigationStep[];
}

export type SensitivityLevel = "low" | "medium" | "high";

export interface DualRouteResult {
  fastest: ScoredRoute;
  quietest: ScoredRoute;
  crowdAlert: { triggered: boolean; message?: string; hotspots: SensorHotspot[] };
  identicalPaths: boolean;
  sensitivity: SensitivityLevel;
}

export interface PredictiveAlert {
  locationId: number;
  sensorName: string;
  latitude: number;
  longitude: number;
  currentTypicalCount: number;
  nextHourExpectedCount: number;
  willBeBusy: boolean;
}

export interface LatLon {
  lat: number;
  lon: number;
}

export interface PlaceSuggestion {
  label: string;
  lat: number;
  lon: number;
}
