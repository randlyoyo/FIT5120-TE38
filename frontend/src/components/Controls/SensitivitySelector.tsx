import type { CSSProperties } from "react";
import { useAppState } from "../../context/AppStateContext";
import type { SensitivityLevel } from "../../types";

// Mirrors backend/src/config/sensitivity.ts SENSITIVITY_THRESHOLDS - keep these two in sync if
// the calibration changes. Shown to the user directly instead of a bare "Low/Medium/High"
// label, since that alone gives no sense of how busy a spot has to be before it counts as
// "crowded" for them. Note: this threshold does NOT limit how far the quietest route detours -
// quietest always picks the calmest available path regardless of distance (see
// backend/src/services/routingService.ts planDualRoutes for why).
// Colour mirrors the app's existing low/medium/high convention used everywhere else
// (SensoryFieldLayer, MarkersLayer, route dots): green = calm, yellow = moderate, red = crowded.
const LEVELS: { value: SensitivityLevel; label: string; threshold: number; color: string }[] = [
  { value: "low", label: "Low", threshold: 130, color: "#16a34a" },
  { value: "medium", label: "Medium", threshold: 75, color: "#eab308" },
  { value: "high", label: "High", threshold: 35, color: "#dc2626" },
];

// User-defined crowd-sensitivity preference (spec US 1.3). Drives both which sensor readings
// count as "crowded enough to alert on" and how far the quietest route is willing to detour -
// see backend/src/config/sensitivity.ts for how the three tiers were calibrated.
export function SensitivitySelector() {
  const { sensitivity, setSensitivity } = useAppState();

  return (
    <div className="sensitivity-selector">
      <div className="sensitivity-label">
        <span>Crowd sensitivity</span>
        <span className="hint">How little foot traffic should count as "too crowded" for you?</span>
      </div>
      <div className="sensitivity-options" role="radiogroup" aria-label="Crowd sensitivity">
        {LEVELS.map((l) => (
          <button
            key={l.value}
            role="radio"
            aria-checked={sensitivity === l.value}
            className={`sensitivity-option ${sensitivity === l.value ? "selected" : ""}`}
            style={{ "--level-color": l.color } as CSSProperties}
            onClick={() => setSensitivity(l.value)}
          >
            <span className="sensitivity-option-title">
              <span className="sensitivity-option-dot" aria-hidden="true" />
              {l.label}
            </span>
            <span className="sensitivity-option-detail">Flags {l.threshold}+ people/min as crowded</span>
          </button>
        ))}
      </div>
    </div>
  );
}
