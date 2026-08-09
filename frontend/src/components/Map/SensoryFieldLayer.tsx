import L from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { HeatmapPoint } from "../../types";

const DOWNSCALE = 12; // sample the field at 1/DOWNSCALE resolution, then let the canvas smooth-scale it up
const INFLUENCE_METERS = 220; // real-world reach of a single sensor reading
const POWER = 2; // IDW distance exponent

// green (calm) -> yellow -> red (crowded)
function colorForValue(v: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, v));
  const stops: [number, number, number, number][] = [
    [0, 22, 163, 74], // #16a34a
    [0.5, 234, 179, 8], // #eab308
    [1, 239, 68, 68], // #ef4444
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, r0, g0, b0] = stops[i];
    const [p1, r1, g1, b1] = stops[i + 1];
    if (clamped >= p0 && clamped <= p1) {
      const t = (clamped - p0) / (p1 - p0);
      return [r0 + (r1 - r0) * t, g0 + (g1 - g0) * t, b0 + (b1 - b0) * t];
    }
  }
  return [stops[stops.length - 1][1], stops[stops.length - 1][2], stops[stops.length - 1][3]];
}

/**
 * A real Leaflet layer (not a plain DOM child of the container) so it lives inside the
 * overlayPane and inherits Leaflet's own pan/zoom CSS transform - this keeps it visually
 * glued to the map during animations without per-frame JS. Content is repainted with a real
 * inverse-distance-weighted interpolation (metres-based, so it looks the same at every zoom
 * level) only once a gesture finishes (moveend/zoomend), not on every animation frame.
 */
const SensoryField = L.Layer.extend({
  initialize(points: HeatmapPoint[], visible: boolean) {
    this._points = points;
    this._visible = visible;
  },

  onAdd(map: L.Map) {
    this._map = map;
    this._canvas = L.DomUtil.create("canvas", "sensory-field-canvas") as HTMLCanvasElement;
    map.getPanes().overlayPane.appendChild(this._canvas);
    map.on("moveend zoomend resize", this._reset, this);
    this._reset();
    return this;
  },

  onRemove(map: L.Map) {
    if (this._raf) cancelAnimationFrame(this._raf);
    L.DomUtil.remove(this._canvas);
    map.off("moveend zoomend resize", this._reset, this);
  },

  setData(points: HeatmapPoint[], visible: boolean) {
    this._points = points;
    this._visible = visible;
    this._reset();
  },

  _reset() {
    const map: L.Map = this._map;
    const canvas: HTMLCanvasElement = this._canvas;
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, topLeft);

    const size = map.getSize();
    canvas.width = size.x;
    canvas.height = size.y;
    canvas.style.width = `${size.x}px`;
    canvas.style.height = `${size.y}px`;

    // Defer the actual paint to the next frame so it never blocks the tail end of the
    // zoom/pan gesture handling itself.
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this._draw());
  },

  _draw() {
    const map: L.Map = this._map;
    const canvas: HTMLCanvasElement = this._canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = map.getSize();
    ctx.clearRect(0, 0, size.x, size.y);
    if (!this._visible || this._points.length === 0) return;

    const centerLat = map.getCenter().lat;
    const metersPerPixel = (156543.03392 * Math.cos((centerLat * Math.PI) / 180)) / Math.pow(2, map.getZoom());
    const influenceFullPx = INFLUENCE_METERS / metersPerPixel;
    const influenceLowRes = influenceFullPx / DOWNSCALE;

    // Only sensors that could possibly reach into the current viewport are worth considering -
    // with up to ~135 sensors city-wide, this keeps the hot loop small once you're zoomed in.
    const viewBounds = L.latLngBounds(
      map.containerPointToLatLng([-influenceFullPx, -influenceFullPx]),
      map.containerPointToLatLng([size.x + influenceFullPx, size.y + influenceFullPx])
    );

    const lowW = Math.max(1, Math.ceil(size.x / DOWNSCALE));
    const lowH = Math.max(1, Math.ceil(size.y / DOWNSCALE));

    const sources: { x: number; y: number; value: number }[] = [];
    for (const p of this._points as HeatmapPoint[]) {
      if (!viewBounds.contains([p.lat, p.lon])) continue;
      const screen = map.latLngToContainerPoint([p.lat, p.lon]);
      sources.push({ x: screen.x / DOWNSCALE, y: screen.y / DOWNSCALE, value: p.intensity });
    }
    if (sources.length === 0) return;

    // Bucket sources into a uniform grid (cell = influence radius) so each output cell only
    // has to check its own bucket + 8 neighbours instead of every source in the city.
    const bucketSize = Math.max(1, influenceLowRes);
    const buckets = new Map<string, { x: number; y: number; value: number }[]>();
    for (const s of sources) {
      const key = `${Math.floor(s.x / bucketSize)},${Math.floor(s.y / bucketSize)}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.push(s);
      else buckets.set(key, [s]);
    }

    const low = document.createElement("canvas");
    low.width = lowW;
    low.height = lowH;
    const lowCtx = low.getContext("2d")!;
    const image = lowCtx.createImageData(lowW, lowH);

    for (let y = 0; y < lowH; y++) {
      const cby = Math.floor(y / bucketSize);
      for (let x = 0; x < lowW; x++) {
        const cbx = Math.floor(x / bucketSize);

        let sumWeight = 0;
        let sumWeightedValue = 0;
        let nearest = Infinity;

        for (let by = cby - 1; by <= cby + 1; by++) {
          for (let bx = cbx - 1; bx <= cbx + 1; bx++) {
            const bucket = buckets.get(`${bx},${by}`);
            if (!bucket) continue;
            for (const { x: sx, y: sy, value } of bucket) {
              const dx = sx - x;
              const dy = sy - y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > influenceLowRes) continue;
              nearest = Math.min(nearest, dist);
              const weight = 1 / Math.pow(dist + 1, POWER);
              sumWeight += weight;
              sumWeightedValue += weight * value;
            }
          }
        }

        if (sumWeight === 0) continue; // no sensor within range - leave transparent

        const value = sumWeightedValue / sumWeight;
        const edgeFade = 1 - Math.min(1, nearest / influenceLowRes);
        const alpha = Math.round(190 * Math.pow(edgeFade, 0.6));
        const [r, g, b] = colorForValue(value);

        const idx = (y * lowW + x) * 4;
        image.data[idx] = r;
        image.data[idx + 1] = g;
        image.data[idx + 2] = b;
        image.data[idx + 3] = alpha;
      }
    }
    lowCtx.putImageData(image, 0, 0);

    // Smooth-scale the low-res field up to the full canvas - this is what removes the jagged
    // cell edges, and it's a native/hardware-accelerated blit instead of a JS pixel loop.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(low, 0, 0, lowW, lowH, 0, 0, size.x, size.y);
  },
});

interface Props {
  points: HeatmapPoint[];
  visible: boolean;
}

export function SensoryFieldLayer({ points, visible }: Props) {
  const map = useMap();

  useEffect(() => {
    // eslint-disable-next-line new-cap
    const layer = new (SensoryField as any)(points, visible);
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points, visible]);

  return null;
}
