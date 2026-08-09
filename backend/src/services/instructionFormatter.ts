export interface OsrmManeuver {
  type: string;
  modifier?: string;
  exit?: number;
  location: [number, number];
}

export interface OsrmStep {
  distance: number;
  duration: number;
  name: string;
  maneuver: OsrmManeuver;
}

export interface NavigationStep {
  instruction: string;
  streetName: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuverType: string;
  modifier: string | null;
  location: [number, number];
}

const MODIFIER_EN: Record<string, string> = {
  uturn: "make a U-turn",
  "sharp right": "turn sharp right",
  right: "turn right",
  "slight right": "turn slightly right",
  straight: "continue straight",
  "slight left": "turn slightly left",
  left: "turn left",
  "sharp left": "turn sharp left",
};

/** Turns one OSRM maneuver into a short walking-directions string. */
export function formatInstruction(step: OsrmStep): string {
  const { maneuver, name } = step;
  const modifier = maneuver.modifier ?? "straight";
  const mod = MODIFIER_EN[modifier] ?? "continue";
  const onStreet = name ? ` onto ${name}` : "";

  switch (maneuver.type) {
    case "depart":
      return name ? `Head out along ${name}` : "Head out";
    case "arrive":
      return "Arrive at your destination";
    case "roundabout":
    case "rotary":
      return `Enter the roundabout and take the ${maneuver.exit ?? ""} exit${onStreet}`;
    case "exit roundabout":
    case "exit rotary":
      return `Exit the roundabout${onStreet}`;
    case "merge":
      return `Merge${onStreet || " onto the main road"}`;
    case "on ramp":
      return `Take the ramp${onStreet}`;
    case "off ramp":
      return `Take the exit${onStreet}`;
    case "fork":
      return `Keep ${mod.replace("turn ", "")} at the fork${onStreet}`;
    case "end of road":
      return `At the end of the road, ${mod}${onStreet}`;
    case "new name":
    case "continue":
      return name ? `Continue onto ${name}` : "Continue straight";
    case "turn":
      return `${mod}${onStreet}`;
    default:
      return name ? `Continue onto ${name}` : "Continue";
  }
}

export function buildNavigationSteps(steps: OsrmStep[]): NavigationStep[] {
  return steps.map((s) => ({
    instruction: formatInstruction(s),
    streetName: s.name || "",
    distanceMeters: Math.round(s.distance),
    durationSeconds: Math.round(s.duration),
    maneuverType: s.maneuver.type,
    modifier: s.maneuver.modifier ?? null,
    location: s.maneuver.location,
  }));
}
