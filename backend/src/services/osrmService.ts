import axios from "axios";

const OSRM_BASE_URL = process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org";

export interface OsrmRoute {
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
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
      steps: false,
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
  }));
}
