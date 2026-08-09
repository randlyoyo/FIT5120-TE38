import { ArrowLeft, ArrowRight, ArrowUp, ArrowUpLeft, ArrowUpRight, CornerUpLeft, CornerUpRight, Flag, MapPin, RotateCcw } from "lucide-react";
import type { NavigationStep } from "../../types";

const MODIFIER_ICON: Record<string, typeof ArrowUp> = {
  uturn: RotateCcw,
  "sharp left": ArrowLeft,
  left: CornerUpLeft,
  "slight left": ArrowUpLeft,
  straight: ArrowUp,
  "slight right": ArrowUpRight,
  right: CornerUpRight,
  "sharp right": ArrowRight,
};

function iconFor(step: NavigationStep): typeof ArrowUp {
  if (step.maneuverType === "depart") return MapPin;
  if (step.maneuverType === "arrive") return Flag;
  if (step.modifier && MODIFIER_ICON[step.modifier]) return MODIFIER_ICON[step.modifier];
  return ArrowUp;
}

interface Props {
  steps: NavigationStep[];
}

// Turn-by-turn directions list, like a real navigation app (spec 3.1/3.3 "navigate" behaviour).
export function DirectionsList({ steps }: Props) {
  if (steps.length === 0) return null;

  return (
    <ol className="directions-list">
      {steps.map((step, i) => {
        const Icon = iconFor(step);
        return (
          <li key={i}>
            <span className="direction-icon">
              <Icon size={16} strokeWidth={2.25} />
            </span>
            <span className="direction-text">
              {step.instruction}
              {step.distanceMeters > 0 && (
                <span className="direction-distance">
                  {" "}
                  · {step.distanceMeters < 1000 ? `${step.distanceMeters} m` : `${(step.distanceMeters / 1000).toFixed(1)} km`}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
