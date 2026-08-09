import { prisma } from "../models";
import { getFallbackDensityForSensor } from "./bootstrapData";
import { fetchSensorLocationRecords } from "./dataSyncService";
import { haversineMeters } from "../utils/dbHelpers";

export interface SensorDensity {
  locationId: number;
  sensorName: string;
  latitude: number;
  longitude: number;
  count: number;
  isHistorical: boolean;
}

/**
 * Current pedestrian density per sensor: latest realtime_counts row (last 30 min)
 * falling back to the historical average for the current weekday+hour when no
 * realtime reading exists, per spec section 3.3.
 */
export async function getCurrentDensityPerSensor(): Promise<SensorDensity[]> {
  try {
    const sensors = await prisma.sensor.findMany({ where: { status: "A" } });
    if (sensors.length === 0) throw new Error("No sensors in database");

    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const now = new Date();
    const hourOfDay = now.getHours();

    const results: SensorDensity[] = [];
    for (const sensor of sensors) {
      const latest = await prisma.realtimeCount.findFirst({
        where: { sensorId: sensor.locationId, sensingTime: { gte: cutoff } },
        orderBy: { sensingTime: "desc" },
      });

      if (latest) {
        results.push({
          locationId: sensor.locationId,
          sensorName: sensor.sensorName,
          latitude: sensor.latitude,
          longitude: sensor.longitude,
          count: latest.totalCount,
          isHistorical: false,
        });
        continue;
      }

      const historical = await prisma.pedestrianCount.aggregate({
        where: { sensorId: sensor.locationId, hourOfDay },
        _avg: { pedestrianCount: true },
      });

      results.push({
        locationId: sensor.locationId,
        sensorName: sensor.sensorName,
        latitude: sensor.latitude,
        longitude: sensor.longitude,
        count: Math.round(historical._avg.pedestrianCount ?? 0),
        isHistorical: true,
      });
    }
    return results;
  } catch {
    const liveSensors = await fetchSensorLocationRecords(200);
    const now = new Date();
    return liveSensors
      .map((record) => {
        const lat = record.location?.lat ?? record.latitude;
        const lon = record.location?.lon ?? record.longitude;
        if (lat == null || lon == null) return null;
        return {
          locationId: record.location_id,
          sensorName: record.sensor_name,
          latitude: lat,
          longitude: lon,
          count: getFallbackDensityForSensor(record.location_id, now.getHours()),
          isHistorical: true,
        };
      })
      .filter(Boolean) as SensorDensity[];
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
 * Scores a route (array of [lon, lat] coordinates) by summing the pedestrian
 * density of every sensor within SENSOR_RADIUS_M of any point on the route,
 * weighted by inverse distance. Used to rank OSRM route alternatives by
 * "quietness" per spec section 3.3 (distance x (1 + normalised density) weighting).
 */
export function scoreRouteSensoryLoad(
  routeCoords: [number, number][],
  densities: SensorDensity[],
  sensorRadiusM = 120
): { score: number; maxSensorCount: number; hotspots: SensorDensity[] } {
  let score = 0;
  let maxSensorCount = 0;
  const hotspots: SensorDensity[] = [];
  const seen = new Set<number>();

  for (const [lon, lat] of routeCoords) {
    for (const d of densities) {
      const dist = haversineMeters(lat, lon, d.latitude, d.longitude);
      if (dist <= sensorRadiusM) {
        const proximityWeight = 1 - dist / sensorRadiusM;
        score += d.count * proximityWeight;
        maxSensorCount = Math.max(maxSensorCount, d.count);
        if (!seen.has(d.locationId)) {
          seen.add(d.locationId);
          hotspots.push(d);
        }
      }
    }
  }
  return { score, maxSensorCount, hotspots };
}
