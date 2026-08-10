import { DEFAULT_SENSITIVITY, SensitivityLevel, thresholdsFor } from "../config/sensitivity";
import { bearingBetween, destinationPoint, haversineMeters } from "../utils/dbHelpers";
import { buildNavigationSteps, NavigationStep } from "./instructionFormatter";
import { getRouteAlternatives, getRouteViaWaypoint, OsrmRoute } from "./osrmService";
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

const DETOUR_OFFSET_METERS = [120, 280];
// Sanity cap on candidate generation only - rejects a manufactured detour that came back
// absurdly long (e.g. OSRM routing a weird backtrack through the forced waypoint), not a
// meaningful distance budget. Quietest selection itself does not consider distance at all.
const DETOUR_GENERATION_CAP_RATIO = 2.5;

/**
 * OSRM's public demo server very often returns only one route for Melbourne's grid-like CBD
 * streets even with alternatives=true, which leaves "quietest" nothing to pick but the same
 * path as "fastest". When that happens, manufacture up to four genuine detour candidates: find
 * the worst crowd hotspot the direct route passes, and request routes forced through waypoints
 * offset perpendicular to the route on either side of that hotspot, at two different distances
 * (a real detour, since OSRM treats an extra coordinate as mandatory, not optional) - one offset
 * alone often either stays in the same crowded block or overshoots into a worse one, so trying a
 * near and a far option per side gives the selection below more to actually choose between.
 * Candidates that fail to route, or blow out the distance past DETOUR_GENERATION_CAP_RATIO, are
 * dropped - this is a best-effort widening of the candidate pool, not a guaranteed win.
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
 * for the caller's chosen crowd-sensitivity level, plus the crowd alert per 3.5 evaluated
 * against that same user-defined threshold (see src/config/sensitivity.ts for how the three
 * tiers were calibrated).
 *
 * Weighting approach: OSRM supplies up to a few geometrically distinct alternatives for the
 * walking profile (plus manufactured detour candidates when it doesn't - see
 * buildDetourCandidates above); "quietest" is simply whichever candidate has the lowest crowd
 * score, full stop - distance plays no part in the choice. That's deliberate: "fastest" already
 * covers the shortest/quickest option, so "quietest" is only useful as a distinct choice if it's
 * free to trade away distance for calm. An earlier version scaled how much extra distance
 * "quietest" could spend by sensitivity (a detour budget), but that let distance dominate and
 * made quietest collapse back to fastest whenever the calmer candidate exceeded the budget.
 * Sensitivity still governs the crowd-alert threshold and the Low/High sensory-level label
 * (config/sensitivity.ts), just not which candidate "quietest" picks.
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

  const baseScored = baseAlternatives.map((r) => ({
    raw: r,
    score: scoreRouteSensoryLoad(r.geometry.coordinates, densities).score,
  }));

  // "Fastest" must only ever be chosen from OSRM's own alternatives, never from a manufactured
  // detour candidate below - a detour can legitimately report a *shorter duration* than the
  // direct route despite covering more distance (different street/path types imply different
  // walking speeds to OSRM), which would otherwise let a detour silently masquerade as
  // "fastest" and send the user the long way round for no reason.
  const fastestEntry = baseScored.reduce((a, b) => (a.raw.durationSeconds <= b.raw.durationSeconds ? a : b));
  const fastestRaw = fastestEntry.raw;

  const scored = [...baseScored];
  if (baseAlternatives.length === 1) {
    const direct = baseAlternatives[0];
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
    sensitivity,
  };
}
