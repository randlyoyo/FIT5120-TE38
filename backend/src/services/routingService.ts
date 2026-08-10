import { DEFAULT_SENSITIVITY, SensitivityLevel, thresholdsFor } from "../config/sensitivity";
import { buildNavigationSteps, NavigationStep } from "./instructionFormatter";
import { getRouteAlternatives, OsrmRoute } from "./osrmService";
import {
  getCurrentDensityPerSensor,
  scoreRouteSensoryLoad,
  SensorDensity,
} from "./weightCalculator";

export type SensoryLevel = "Low" | "High";

export interface ScoredRoute {
  mode: "fastest" | "quietest";
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  sensoryScore: number;
  sensoryLevel: SensoryLevel;
  /**
   * sensoryScore expressed as a percentage of the caller's sensitivity threshold - 100 is
   * exactly the "High" cutoff for their tier, so it's comparable across fastest/quietest and
   * meaningful without knowing the raw score's units. Uncapped: a route well past the
   * threshold reads e.g. 240, not clamped to 100, so two "High" routes stay distinguishable.
   */
  noiseScore: number;
  hotspots: SensorDensity[];
  steps: NavigationStep[];
}

export interface DualRouteResult {
  fastest: ScoredRoute;
  quietest: ScoredRoute;
  crowdAlert: { triggered: boolean; message?: string; hotspots: SensorDensity[] };
  identicalPaths: boolean;
  sensitivity: SensitivityLevel;
}

function toScoredRoute(
  mode: "fastest" | "quietest",
  route: OsrmRoute,
  densities: SensorDensity[],
  highSensoryScoreThreshold: number
): ScoredRoute {
  const { score, hotspots } = scoreRouteSensoryLoad(route.geometry.coordinates, densities);
  return {
    mode,
    distanceMeters: route.distanceMeters,
    durationSeconds: route.durationSeconds,
    geometry: route.geometry,
    sensoryScore: Math.round(score),
    sensoryLevel: score >= highSensoryScoreThreshold ? "High" : "Low",
    noiseScore: Math.round((score / highSensoryScoreThreshold) * 100),
    hotspots,
    steps: buildNavigationSteps(route.steps),
  };
}

/**
 * distance x (1 + relative sensory load), where "relative" is the route's raw score divided
 * by the caller's own highSensoryScoreThreshold - so the same absolute crowd exposure costs
 * more at a stricter sensitivity tier than a looser one. This is what makes sensitivity
 * actually change *which* OSRM alternative wins "quietest", not just how it's labelled: at
 * "high" sensitivity a meaningfully quieter but longer alternative can out-score a shorter,
 * busier one, where at "low" sensitivity the same pair would rank the other way.
 */
function combinedCost(distanceMeters: number, score: number, highSensoryScoreThreshold: number): number {
  return distanceMeters * (1 + score / highSensoryScoreThreshold);
}

/**
 * Computes dual-mode routing per spec 3.3/1.3: fastest (shortest travel time) and quietest
 * for the caller's chosen crowd-sensitivity level, plus the crowd alert per 3.5 evaluated
 * against that same user-defined threshold (see src/config/sensitivity.ts for how the three
 * tiers were calibrated).
 *
 * Weighting approach: OSRM supplies up to a few geometrically distinct alternatives for the
 * walking profile; each is scored as distance x (1 + relative sensory load) via
 * combinedCost() above, and the lowest-cost alternative is offered as "quietest". Because the
 * relative-load term is normalised against the caller's own sensitivity threshold, sensitivity
 * doesn't just relabel a fixed pick - it can change *which* alternative wins: at "high"
 * sensitivity the algorithm will trade more distance for a quieter path than it would at "low".
 * This approximates the spec's Dijkstra-over-weighted-edges approach without requiring a
 * self-hosted OSRM instance with custom edge weights.
 */
export async function planDualRoutes(
  start: { lat: number; lon: number },
  end: { lat: number; lon: number },
  sensitivity: SensitivityLevel = DEFAULT_SENSITIVITY
): Promise<DualRouteResult> {
  const { crowdAlertThreshold, highSensoryScoreThreshold } = thresholdsFor(sensitivity);

  const [alternatives, densities] = await Promise.all([
    getRouteAlternatives(start, end),
    getCurrentDensityPerSensor(),
  ]);

  const baseAlternatives = alternatives.length > 1 ? alternatives : [alternatives[0]];

  const scored = baseAlternatives.map((r) => ({
    raw: r,
    score: scoreRouteSensoryLoad(r.geometry.coordinates, densities).score,
  }));

  const fastestEntry = scored.reduce((a, b) => (a.raw.durationSeconds <= b.raw.durationSeconds ? a : b));
  const fastestRaw = fastestEntry.raw;
  const quietestEntry = scored.reduce((a, b) => {
    const costA = combinedCost(a.raw.distanceMeters, a.score, highSensoryScoreThreshold);
    const costB = combinedCost(b.raw.distanceMeters, b.score, highSensoryScoreThreshold);
    return costA <= costB ? a : b;
  });
  const quietestCandidateRaw = baseAlternatives.length > 1 ? quietestEntry.raw : fastestRaw;

  const fastest = toScoredRoute("fastest", fastestRaw, densities, highSensoryScoreThreshold);
  const quietest = toScoredRoute("quietest", quietestCandidateRaw, densities, highSensoryScoreThreshold);

  const overThreshold = quietest.hotspots.filter((h) => h.count >= crowdAlertThreshold);
  const crowdAlert = {
    triggered: overThreshold.length > 0,
    message:
      overThreshold.length > 0
        ? `Ahead is currently crowded near ${overThreshold[0].sensorName} - consider an alternate route.`
        : undefined,
    hotspots: overThreshold,
  };

  return {
    fastest,
    quietest,
    crowdAlert,
    identicalPaths:
      baseAlternatives.length <= 1 ||
      (fastestRaw.geometry.coordinates.length === quietestCandidateRaw.geometry.coordinates.length &&
        fastestRaw.distanceMeters === quietestCandidateRaw.distanceMeters),
    sensitivity,
  };
}
