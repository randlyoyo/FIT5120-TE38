import axios from "axios";
import { OsrmStep } from "./instructionFormatter";

const OSRM_BASE_URL = process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org";

export interface OsrmRoute {
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  steps: OsrmStep[];
}

/**
 * Fetches walking route alternatives between two points from the OSRM public
 * demo server (foot profile). The demo server is rate-limited and intended
 * for light/testing use only - swap OSRM_BASE_URL for a self-hosted instance
 * (see data/README) for production use.
 */
export async function getRouteAlternatives(
  start: { lat: number; lon: number },
  end: { lat: number; lon: number }
): Promise<OsrmRoute[]> {
  const coords = `${start.lon},${start.lat};${end.lon},${end.lat}`;
  const url = `${OSRM_BASE_URL}/route/v1/foot/${coords}`;

  const { data } = await axios.get(url, {
    params: {
      alternatives: true,
      overview: "full",
      geometries: "geojson",
      steps: true,
    },
    timeout: 8000,
  });

  if (data.code !== "Ok" || !Array.isArray(data.routes) || data.routes.length === 0) {
    throw new Error(`OSRM routing failed: ${data.code ?? "unknown error"}`);
  }

  return data.routes.map((r: any) => ({
    distanceMeters: r.distance,
    durationSeconds: r.duration,
    geometry: r.geometry,
    // A walking A-to-B request has exactly one leg; flatten its steps for turn-by-turn directions.
    steps: (r.legs ?? []).flatMap((leg: any) => leg.steps ?? []),
  }));
}

/**
 * Fetches a single walking route forced through an intermediate waypoint (a real detour, not
 * an "alternative" - OSRM treats every non-endpoint coordinate as mandatory). Used to manufacture
 * a genuinely different "quietest" candidate when the demo server's alternatives=true comes back
 * with only one route, which it very often does for Melbourne's grid-like CBD streets. Returns
 * null (rather than throwing) on any failure, since this is a best-effort extra candidate, not
 * a required part of the response.
 */
export async function getRouteViaWaypoint(
  start: { lat: number; lon: number },
  via: { lat: number; lon: number },
  end: { lat: number; lon: number }
): Promise<OsrmRoute | null> {
  const coords = `${start.lon},${start.lat};${via.lon},${via.lat};${end.lon},${end.lat}`;
  const url = `${OSRM_BASE_URL}/route/v1/foot/${coords}`;

  try {
    const { data } = await axios.get(url, {
      params: { overview: "full", geometries: "geojson", steps: true },
      timeout: 8000,
    });

    if (data.code !== "Ok" || !Array.isArray(data.routes) || data.routes.length === 0) return null;

    const r = data.routes[0];
    return {
      distanceMeters: r.distance,
      durationSeconds: r.duration,
      geometry: r.geometry,
      steps: (r.legs ?? []).flatMap((leg: any) => leg.steps ?? []),
    };
  } catch {
    return null;
  }
}
