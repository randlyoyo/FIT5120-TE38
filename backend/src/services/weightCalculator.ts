import { getCurrentCrowding, CrowdLevel, DataQuality } from "./dbQueries";
import { getFallbackDensityForSensor, getFallbackSensors } from "./bootstrapData";
import { haversineMeters } from "../utils/dbHelpers";

export interface SensorDensity {
  locationId: number;
  sensorName: string;
  latitude: number;
  longitude: number;
  count: number;
  sensoryLoad: number;
  crowdLevel: CrowdLevel;
  dataQuality: DataQuality;
  lastReadingTs: string | null;
}

/**
 * Current pedestrian density per sensor, read straight from the team's
 * v_current_crowding view - it already falls back live -> hourly baseline ->
 * historical median and stamps data_quality, so no client-side fallback math
 * is needed here. Only touches the static in-memory fallback if the DB itself
 * is unreachable.
 */
export async function getCurrentDensityPerSensor(): Promise<SensorDensity[]> {
  try {
    const rows = await getCurrentCrowding();
    if (rows.length === 0) throw new Error("v_current_crowding returned no rows");

    return rows.map((r) => ({
      locationId: r.locationId,
      sensorName: r.sensorName,
      latitude: r.latitude,
      longitude: r.longitude,
      count: r.displayCountPerMinute,
      sensoryLoad: r.sensoryLoad ?? 0,
      crowdLevel: r.crowdLevel,
      dataQuality: r.dataQuality,
      lastReadingTs: r.lastReadingTs,
    }));
  } catch (err) {
    console.warn("[weightCalculator] team DB unavailable, using static fallback densities:", (err as Error).message);
    const now = new Date();
    return getFallbackSensors().map((s) => ({
      locationId: s.locationId,
      sensorName: s.sensorName,
      latitude: s.latitude,
      longitude: s.longitude,
      count: getFallbackDensityForSensor(s.locationId, now.getHours()),
      sensoryLoad: 0,
      crowdLevel: "low",
      dataQuality: "no_live_data",
      lastReadingTs: null,
    }));
  }
}

/** Normalises counts to a 0-1 sensory load factor using the current max as ceiling. */
export function normalizeDensities(densities: SensorDensity[]): Map<number, number> {
  const max = Math.max(1, ...densities.map((d) => d.count));
  const map = new Map<number, number>();
  for (const d of densities) map.set(d.locationId, d.count / max);
  return map;
}

/**
 * Scores a route (array of [lon, lat] coordinates) by summing the pedestrian density of every
 * sensor within sensorRadiusM of the route's *closest approach*, weighted by that closest
 * distance. Used to rank OSRM route alternatives by "quietness" per spec section 3.3 (distance x
 * (1 + normalised density) weighting).
 *
 * Each sensor contributes at most once, via its single nearest point on the route - not once per
 * nearby polyline vertex. OSRM's `overview=full` geometry is dense (a vertex roughly every
 * 15-20m), so a sensor within the radius is typically close to several consecutive vertices;
 * summing across all of them previously inflated scores ~5-10x per sensor and scaled with how
 * many vertices a route happens to have, which systematically penalised longer "quietest" detour
 * candidates for their vertex count rather than their actual crowd exposure - collapsing
 * "quietest" back to "fastest" far more often than the crowd data warranted.
 */
export function scoreRouteSensoryLoad(
  routeCoords: [number, number][],
  densities: SensorDensity[],
  sensorRadiusM = 120
): { score: number; maxSensorCount: number; hotspots: SensorDensity[] } {
  let score = 0;
  let maxSensorCount = 0;
  const hotspots: SensorDensity[] = [];

  for (const d of densities) {
    let minDist = Infinity;
    for (const [lon, lat] of routeCoords) {
      const dist = haversineMeters(lat, lon, d.latitude, d.longitude);
      if (dist < minDist) minDist = dist;
    }
    if (minDist <= sensorRadiusM) {
      const proximityWeight = 1 - minDist / sensorRadiusM;
      score += d.count * proximityWeight;
      maxSensorCount = Math.max(maxSensorCount, d.count);
      hotspots.push(d);
    }
  }
  return { score, maxSensorCount, hotspots };
}
