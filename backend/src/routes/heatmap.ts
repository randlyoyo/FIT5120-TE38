import { Router } from "express";
import { cache, CACHE_KEYS } from "../services/cacheService";
import { getCurrentDensityPerSensor } from "../services/weightCalculator";

export const heatmapRouter = Router();

// GET /api/heatmap - [lat, lon, intensity] points for react-leaflet-heatmap-layer (spec 3.2).
// dataQuality follows the team DB's three states (说明.md): live / stale / no_live_data -
// the frontend must reflect this rather than presenting every point as an equally-live reading.
heatmapRouter.get("/", async (_req, res) => {
  try {
    const cached = cache.get(CACHE_KEYS.heatmap);
    if (cached) return res.json(cached);

    const densities = await getCurrentDensityPerSensor();
    const maxCount = Math.max(1, ...densities.map((d) => d.count));

    const points = densities.map((d) => ({
      locationId: d.locationId,
      lat: d.latitude,
      lon: d.longitude,
      count: d.count,
      intensity: Number((d.count / maxCount).toFixed(3)),
      sensorName: d.sensorName,
      sensoryLoad: d.sensoryLoad,
      crowdLevel: d.crowdLevel,
      dataQuality: d.dataQuality,
      lastReadingTs: d.lastReadingTs,
    }));

    cache.set(CACHE_KEYS.heatmap, points, 60);
    res.json(points);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load heatmap data" });
  }
});
