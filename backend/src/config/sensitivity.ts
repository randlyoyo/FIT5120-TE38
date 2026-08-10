export type SensitivityLevel = "low" | "medium" | "high";

/**
 * Per-sensor pedestrian-count thresholds that trigger a crowd alert / flip a route's sensory
 * label to "High", one per user sensitivity preference (US 1.3 - user-defined crowd threshold).
 *
 * Calibrated against the 40th/65th/85th percentile of the real City of Melbourne pedestrian
 * counts already in `pedestrian_counts` (checked via SQL: p40≈33, p65≈77, p85≈133), not picked
 * arbitrarily. "High" sensitivity intentionally sits well below the classic urban-planning
 * crowding benchmark (Fruin/London Pedestrian Comfort Level uses ~13 people/m/min as "crowded")
 * because sensory-overload research shows moderate crowd density already raises cognitive load
 * for sensory-sensitive/neurodivergent pedestrians, before a space would count as "crowded" by
 * general planning standards.
 */
export const SENSITIVITY_THRESHOLDS: Record<SensitivityLevel, number> = {
  high: 35, // most protective - flags even moderate foot traffic
  medium: 75, // balanced default
  low: 130, // only flags genuinely busy conditions
};

export const DEFAULT_SENSITIVITY: SensitivityLevel = "medium";

// Cumulative route sensory-score threshold scales with the per-sensor alert threshold, since a
// route's score sums proximity-weighted counts along every sensor it passes near.
const ROUTE_SCORE_MULTIPLIER = 1.5;

export function resolveSensitivity(input: unknown): SensitivityLevel {
  return input === "low" || input === "medium" || input === "high" ? input : DEFAULT_SENSITIVITY;
}

export function thresholdsFor(level: SensitivityLevel) {
  const crowdAlertThreshold = SENSITIVITY_THRESHOLDS[level];
  return {
    crowdAlertThreshold,
    highSensoryScoreThreshold: Math.round(crowdAlertThreshold * ROUTE_SCORE_MULTIPLIER),
  };
}
