import { getRouteAlternatives, OsrmRoute } from "./osrmService";
import {
  getCurrentDensityPerSensor,
  scoreRouteSensoryLoad,
  SensorDensity,
} from "./weightCalculator";

const CROWD_ALERT_THRESHOLD = Number(process.env.CROWD_ALERT_THRESHOLD ?? 100);
// Score above which a route is labelled "High" sensory load (tune against real data).
const HIGH_SENSORY_SCORE_THRESHOLD = 150;

export type SensoryLevel = "Low" | "High";

export interface ScoredRoute {
  mode: "fastest" | "quietest";
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  sensoryScore: number;
  sensoryLevel: SensoryLevel;
  hotspots: SensorDensity[];
}

export interface DualRouteResult {
  fastest: ScoredRoute;
  quietest: ScoredRoute;
  crowdAlert: { triggered: boolean; message?: string; hotspots: SensorDensity[] };
  identicalPaths: boolean;
}

function toScoredRoute(
  mode: "fastest" | "quietest",
  route: OsrmRoute,
  densities: SensorDensity[]
): ScoredRoute {
  const { score, hotspots } = scoreRouteSensoryLoad(route.geometry.coordinates, densities);
  return {
    mode,
    distanceMeters: route.distanceMeters,
    durationSeconds: route.durationSeconds,
    geometry: route.geometry,
    sensoryScore: Math.round(score),
    sensoryLevel: score >= HIGH_SENSORY_SCORE_THRESHOLD ? "High" : "Low",
    hotspots,
  };
}

/**
 * Computes dual-mode routing per spec 3.3: fastest (shortest travel time) and
 * quietest (lowest pedestrian-density exposure), plus the crowd alert per 3.5.
 *
 * Weighting approach: OSRM supplies up to a few geometrically distinct
 * alternatives for the walking profile; each is scored as
 * distance x (1 + normalised pedestrian density along the path) and the
 * lowest-scoring alternative is offered as the "quietest" route. This
 * approximates the spec's Dijkstra-over-weighted-edges approach without
 * requiring a self-hosted OSRM instance with custom edge weights.
 */
export async function planDualRoutes(
  start: { lat: number; lon: number },
  end: { lat: number; lon: number }
): Promise<DualRouteResult> {
  const [alternatives, densities] = await Promise.all([
    getRouteAlternatives(start, end),
    getCurrentDensityPerSensor(),
  ]);

  const scored = alternatives.map((r) => ({
    raw: r,
    score: scoreRouteSensoryLoad(r.geometry.coordinates, densities).score,
  }));

  const fastestRaw = alternatives.reduce((a, b) => (a.durationSeconds <= b.durationSeconds ? a : b));
  const quietestEntry = scored.reduce((a, b) => (a.score <= b.score ? a : b));

  const fastest = toScoredRoute("fastest", fastestRaw, densities);
  const quietest = toScoredRoute("quietest", quietestEntry.raw, densities);

  const overThreshold = quietest.hotspots.filter((h) => h.count >= CROWD_ALERT_THRESHOLD);
  const crowdAlert = {
    triggered: overThreshold.length > 0,
    message:
      overThreshold.length > 0
        ? `前方路段当前拥挤 (${overThreshold[0].sensorName})，建议考虑绕行 / Ahead is currently crowded near ${overThreshold[0].sensorName} - consider an alternate route.`
        : undefined,
    hotspots: overThreshold,
  };

  return {
    fastest,
    quietest,
    crowdAlert,
    identicalPaths:
      fastestRaw.geometry.coordinates.length === quietestEntry.raw.geometry.coordinates.length &&
      fastestRaw.distanceMeters === quietestEntry.raw.distanceMeters,
  };
}
