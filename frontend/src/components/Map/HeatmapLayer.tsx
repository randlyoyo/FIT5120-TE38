import L from "leaflet";
import "leaflet.heat";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { HeatmapPoint } from "../../types";

interface Props {
  points: HeatmapPoint[];
  visible: boolean;
}

/**
 * Pedestrian-density heatmap layer (spec 3.2). Uses leaflet.heat directly -
 * the react-leaflet-heatmap-layer package named in the original tech spec is
 * unmaintained and breaks under React 18 - this thin wrapper achieves the
 * same green -> yellow -> red low-to-high density gradient.
 */
export function HeatmapLayer({ points, visible }: Props) {
  const map = useMap();

  useEffect(() => {
    if (!visible || points.length === 0) return;

    const heatPoints: [number, number, number][] = points.map((p) => [
      p.lat,
      p.lon,
      Math.max(0.15, p.intensity),
    ]);

    const layer = L.heatLayer(heatPoints, {
      radius: 35,
      blur: 25,
      maxZoom: 18,
      gradient: { 0.2: "#22c55e", 0.5: "#eab308", 1.0: "#ef4444" },
    });

    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points, visible]);

  return null;
}
