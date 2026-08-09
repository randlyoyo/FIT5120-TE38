import { useAppState } from "../../context/AppStateContext";
import type { SensitivityLevel } from "../../types";

const LEVELS: { value: SensitivityLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

// User-defined crowd-sensitivity preference (spec US 1.3). Drives both which sensor readings
// count as "crowded enough to alert on" and the route's High/Low sensory-load label - see
// backend/src/config/sensitivity.ts for how the three tiers were calibrated.
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
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
