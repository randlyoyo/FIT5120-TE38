type NoiseTier = "calm" | "moderate" | "loud";

const TIER_LABEL: Record<NoiseTier, string> = {
  calm: "Calm",
  moderate: "Moderate",
  loud: "Loud",
};

// 100 = exactly the app's crowd threshold (see backend routingService.ts noiseScore) - below it
// reads calm/moderate, at or past it reads loud.
function noiseTier(noiseScore: number): NoiseTier {
  if (noiseScore < 50) return "calm";
  if (noiseScore < 100) return "moderate";
  return "loud";
}

interface Props {
  noiseScore: number;
}

export function NoiseBadge({ noiseScore }: Props) {
  const tier = noiseTier(noiseScore);
  return (
    <span
      className={`noise-badge ${tier}`}
      title={`Noise score ${noiseScore} — 100 is the app's crowd threshold`}
    >
      {noiseScore} <span className="noise-badge-label">{TIER_LABEL[tier]}</span>
    </span>
  );
}
