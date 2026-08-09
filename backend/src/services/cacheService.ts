import NodeCache from "node-cache";

// stdTTL in seconds; realtime pedestrian data is only meaningful for a few minutes
export const cache = new NodeCache({ stdTTL: 60, checkperiod: 30 });

export const CACHE_KEYS = {
  heatmap: "heatmap:latest",
  quietSpaces: "spaces:all",
  sensors: "sensors:all",
} as const;
