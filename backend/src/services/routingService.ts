import { DEFAULT_SENSITIVITY, thresholdsFor } from "../config/sensitivity";
import { bearingBetween, destinationPoint, haversineMeters } from "../utils/dbHelpers";
import { buildNavigationSteps, NavigationStep } from "./instructionFormatter";
import { getRouteAlternatives, getRouteViaWaypoint, OsrmRoute } from "./osrmService";
import {
  getCurrentDensityPerSensor,
  scoreRouteSensoryLoad,
  SensorDensity,
} from "./weightCalculator";

export type SensoryLevel = "Low" | "High";
export type RouteMode = "fastest" | "quietest";

export interface ScoredRoute {
  mode: RouteMode;
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  sensoryScore: number;
  sensoryLevel: SensoryLevel;
  /**
   * sensoryScore expressed as a percentage of the app's crowd threshold - 100 is exactly the
   * "High" cutoff, so it's comparable across fastest/quietest and meaningful without knowing the
   * raw score's units. Uncapped: a route well past the threshold reads e.g. 240, not clamped to
   * 100, so two "High" routes stay distinguishable.
   */
  noiseScore: number;
  hotspots: SensorDensity[];
  steps: NavigationStep[];
}

export interface RoutePlanResult {
  fastest: ScoredRoute;
  quietest: ScoredRoute;
  crowdAlert: { triggered: boolean; message?: string; hotspots: SensorDensity[] };
  identicalPaths: boolean;
}

function toScoredRoute(
  mode: RouteMode,
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

const DETOUR_OFFSET_METERS = [120, 280];
// Sanity cap on candidate generation only - rejects a manufactured detour that came back
// absurdly long (e.g. OSRM routing a weird backtrack through the forced waypoint), not a
// meaningful distance budget. Quietest selection itself does not consider distance at all.
const DETOUR_GENERATION_CAP_RATIO = 2.5;

// Two candidates count as the same route for diversity purposes if their crowd scores are
// within this fraction of each other - OSRM's alternatives=true frequently hands back two (or
// more) routes that only differ by which side of a median strip or footbridge they use, which
// are functionally identical for "avoid crowds" purposes even though they're distinct polylines.
const SCORE_DIVERSITY_TOLERANCE = 0.1;

/**
 * OSRM's public demo server very often returns only one route for Melbourne's grid-like CBD
 * streets even with alternatives=true - and even when it does return more than one, they're
 * frequently near-duplicates of each other (same streets, sub-1% difference in distance/duration)
 * rather than genuinely distinct paths. Either way, "quietest" is left with nothing meaningfully
 * different to pick from "fastest". When that happens, manufacture up to four genuine detour
 * candidates: find the worst crowd hotspot the direct route passes, and request routes forced
 * through waypoints offset perpendicular to the route on either side of that hotspot, at two
 * different distances (a real detour, since OSRM treats an extra coordinate as mandatory, not
 * optional) - one offset alone often either stays in the same crowded block or overshoots into a
 * worse one, so trying a near and a far option per side gives the selection below more to
 * actually choose between. Candidates that fail to route, or blow out the distance past
 * DETOUR_GENERATION_CAP_RATIO, are dropped - this is a best-effort widening of the candidate
 * pool, not a guaranteed win.
 */
async function buildDetourCandidates(
  start: { lat: number; lon: number },
  end: { lat: number; lon: number },
  direct: OsrmRoute,
  worstHotspot: SensorDensity
): Promise<OsrmRoute[]> {
  const coords = direct.geometry.coordinates;
  let nearestIndex = 0;
  let nearestDist = Infinity;
  coords.forEach(([lon, lat], i) => {
    const d = haversineMeters(lat, lon, worstHotspot.latitude, worstHotspot.longitude);
    if (d < nearestDist) {
      nearestDist = d;
      nearestIndex = i;
    }
  });

  const prevIdx = Math.max(0, nearestIndex - 3);
  const nextIdx = Math.min(coords.length - 1, nearestIndex + 3);
  const [lon1, lat1] = coords[prevIdx];
  const [lon2, lat2] = coords[nextIdx];
  const routeBearing = bearingBetween(lat1, lon1, lat2, lon2);
  const [avoidLon, avoidLat] = coords[nearestIndex];

  const bearings = [routeBearing + 90, routeBearing - 90];
  const combinations = bearings.flatMap((bearing) => DETOUR_OFFSET_METERS.map((offset) => ({ bearing, offset })));

  const candidates = await Promise.all(
    combinations.map(async ({ bearing, offset }) => {
      const waypoint = destinationPoint(avoidLat, avoidLon, bearing, offset);
      const route = await getRouteViaWaypoint(start, waypoint, end);
      if (!route) return null;
      if (route.distanceMeters > direct.distanceMeters * DETOUR_GENERATION_CAP_RATIO) return null;
      return route;
    })
  );

  return candidates.filter((r): r is OsrmRoute => r !== null);
}

/**
 * Computes dual-mode routing per spec 3.3/1.3: fastest (shortest travel time) and quietest
 * (lowest crowd exposure, full stop), plus the crowd alert per 3.5, all evaluated against the
 * app's single crowd threshold (DEFAULT_SENSITIVITY, see src/config/sensitivity.ts for how it
 * was calibrated) - there's no user-selectable sensitivity tier.
 *
 * Weighting approach: OSRM supplies up to a few geometrically distinct alternatives for the
 * walking profile (plus manufactured detour candidates when it doesn't - see
 * buildDetourCandidates above); "quietest" is simply whichever candidate has the lowest crowd
 * score, full stop - distance plays no part in the choice. That's deliberate: "fastest" already
 * covers the shortest/quickest option, so "quietest" is only useful as a distinct choice if it's
 * free to trade away distance for calm.
 *
 * "Fastest" and "quietest" are each picked from the *entire* candidate pool (OSRM alternatives +
 * manufactured detours), not just the raw OSRM alternatives - so neither can ever report a worse
 * duration/score than the other actually has on offer (a manufactured detour could otherwise
 * masquerade as "fastest" despite covering more distance, since OSRM's duration model doesn't
 * always scale with the extra distance a detour covers).
 */
export async function planRoutes(
  start: { lat: number; lon: number },
  end: { lat: number; lon: number }
): Promise<RoutePlanResult> {
  const { crowdAlertThreshold, highSensoryScoreThreshold } = thresholdsFor(DEFAULT_SENSITIVITY);

  const [alternatives, densities] = await Promise.all([
    getRouteAlternatives(start, end),
    getCurrentDensityPerSensor(),
  ]);

  const baseAlternatives = alternatives.length > 1 ? alternatives : [alternatives[0]];

  const baseScored = baseAlternatives.map((r) => ({
    raw: r,
    score: scoreRouteSensoryLoad(r.geometry.coordinates, densities).score,
  }));

  // Real diversity means the calmest base alternative is meaningfully calmer than the busiest -
  // not just "OSRM returned more than one route". A worst score of 0 means every base
  // alternative already has zero crowd exposure, so there's nothing to route around either way.
  const baseScores = baseScored.map((c) => c.score);
  const bestBaseScore = Math.min(...baseScores);
  const worstBaseScore = Math.max(...baseScores);
  const hasRealDiversity = worstBaseScore === 0 || bestBaseScore <= worstBaseScore * (1 - SCORE_DIVERSITY_TOLERANCE);

  const scored = [...baseScored];
  if (!hasRealDiversity) {
    const direct = baseScored.reduce((a, b) => (a.score <= b.score ? a : b)).raw;
    const { hotspots } = scoreRouteSensoryLoad(direct.geometry.coordinates, densities);
    const worstHotspot = hotspots.reduce<SensorDensity | null>(
      (worst, h) => (!worst || h.count > worst.count ? h : worst),
      null
    );
    if (worstHotspot) {
      const detours = await buildDetourCandidates(start, end, direct, worstHotspot);
      for (const d of detours) {
        scored.push({ raw: d, score: scoreRouteSensoryLoad(d.geometry.coordinates, densities).score });
      }
    }
  }

  // "Fastest" is the minimum duration across the entire candidate pool (OSRM's own alternatives
  // plus any manufactured detours) - not just the raw OSRM alternatives.
  const fastestEntry = scored.reduce((a, b) => (a.raw.durationSeconds <= b.raw.durationSeconds ? a : b));
  const fastestRaw = fastestEntry.raw;

  // Quietest = lowest crowd score among all candidates (OSRM alternatives + manufactured
  // detours), no distance limit - see the doc comment above for why distance is intentionally
  // not a factor here. Tie-break on distance only when scores are exactly equal.
  const quietestEntry = scored.reduce((a, b) => {
    if (a.score !== b.score) return a.score <= b.score ? a : b;
    return a.raw.distanceMeters <= b.raw.distanceMeters ? a : b;
  });
  const quietestCandidateRaw = quietestEntry.raw;

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
    // Reference equality, not a distance/point-count comparison: quietestCandidateRaw is always
    // one of the actual objects in `scored` (the direct route, or a manufactured detour), so
    // this is exact rather than a coincidence-prone approximation.
    identicalPaths: fastestRaw === quietestCandidateRaw,
  };
}
