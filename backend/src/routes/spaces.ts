import { Router } from "express";
import { cache, CACHE_KEYS } from "../services/cacheService";
import { getFallbackQuietSpaces, getFallbackSensors } from "../services/bootstrapData";
import { getAllSensors, getAllSensoryRefuges } from "../services/dbQueries";

export const spacesRouter = Router();

// GET /api/spaces - sensory-refuge landmarks (parks, libraries, galleries) for map markers.
// Category filtering is team-judgement, not an official council classification - see 说明.md
// (excludes cemeteries, public buildings, visitor centres).
spacesRouter.get("/", async (_req, res) => {
  try {
    const cached = cache.get(CACHE_KEYS.quietSpaces);
    if (cached) return res.json(cached);

    try {
      const refuges = await getAllSensoryRefuges();
      const spaces = refuges.map((r) => ({
        id: r.landmarkId,
        featureName: r.featureName,
        theme: r.themeName,
        subTheme: r.subTheme,
        latitude: r.latitude,
        longitude: r.longitude,
        address: null,
      }));
      cache.set(CACHE_KEYS.quietSpaces, spaces, 300);
      res.json(spaces);
    } catch (dbError) {
      console.warn("[spaces] team DB unavailable, using static fallback quiet spaces:", (dbError as Error).message);
      const fallback = getFallbackQuietSpaces();
      cache.set(CACHE_KEYS.quietSpaces, fallback, 300);
      res.json(fallback);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load quiet spaces" });
  }
});

// GET /api/spaces/sensors - sensor point locations for the base map layer.
spacesRouter.get("/sensors", async (_req, res) => {
  try {
    const cached = cache.get(CACHE_KEYS.sensors);
    if (cached) return res.json(cached);

    let sensors: Array<{
      locationId: number;
      sensorName: string;
      sensorDescription: string | null;
      latitude: number;
      longitude: number;
      status: string;
    }> = [];

    try {
      sensors = await getAllSensors();
    } catch (dbError) {
      console.warn("[spaces/sensors] team DB unavailable, using static fallback sensors:", (dbError as Error).message);
    }

    if (sensors.length === 0) {
      const fallback = getFallbackSensors();
      cache.set(CACHE_KEYS.sensors, fallback, 300);
      return res.json(fallback);
    }

    cache.set(CACHE_KEYS.sensors, sensors, 300);
    return res.json(sensors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load sensors" });
  }
});
