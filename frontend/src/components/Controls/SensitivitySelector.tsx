import { useAppState } from "../../context/AppStateContext";
import type { SensitivityLevel } from "../../types";

// Mirrors backend/src/config/sensitivity.ts (SENSITIVITY_THRESHOLDS, DETOUR_BUDGET_RATIO) -
// keep these two in sync if the calibration changes. Shown to the user directly instead of a
// bare "Low/Medium/High" label, since that alone gives no sense of what each tier actually
// does: how busy a spot has to be before it's flagged, and how much extra walking "quietest"
// is willing to spend to avoid it.
const LEVELS: { value: SensitivityLevel; label: string; threshold: number; detourPercent: number }[] = [
  { value: "low", label: "Low", threshold: 130, detourPercent: 15 },
  { value: "medium", label: "Medium", threshold: 75, detourPercent: 35 },
  { value: "high", label: "High", threshold: 35, detourPercent: 70 },
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
            onClick={() => setSensitivity(l.value)}
          >
            <span className="sensitivity-option-title">{l.label}</span>
            <span className="sensitivity-option-detail">
              Flags {l.threshold}+ people/min · detours up to {l.detourPercent}% further to avoid crowds
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
