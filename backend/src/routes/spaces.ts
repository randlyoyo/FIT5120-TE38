import { Router } from "express";
import { prisma } from "../models";
import { cache, CACHE_KEYS } from "../services/cacheService";
import { getFallbackQuietSpaces, getFallbackSensors } from "../services/bootstrapData";
import { fetchSensorLocationRecords } from "../services/dataSyncService";

export const spacesRouter = Router();

// GET /api/spaces - all quiet spaces (parks, libraries, galleries) for map markers.
spacesRouter.get("/", async (_req, res) => {
  try {
    const cached = cache.get(CACHE_KEYS.quietSpaces);
    if (cached) return res.json(cached);

    try {
      const spaces = await prisma.quietSpace.findMany();
      cache.set(CACHE_KEYS.quietSpaces, spaces, 300);
      res.json(spaces);
    } catch {
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

    let sensors: Array<{ locationId: number; sensorName: string; latitude: number; longitude: number; status: string }> = [];

    try {
      sensors = await prisma.sensor.findMany({ where: { status: "A" } });
    } catch (dbError) {
      console.warn("[spaces/sensors] DB unavailable, using live Melbourne sensor records instead", (dbError as Error).message);
    }

    if (sensors.length === 0) {
      const liveSensors = await fetchSensorLocationRecords(200);
      sensors = liveSensors
        .map((record) => {
          const lat = record.location?.lat ?? record.latitude;
          const lon = record.location?.lon ?? record.longitude;
          if (lat == null || lon == null) return null;
          return {
            locationId: record.location_id,
            sensorName: record.sensor_name,
            latitude: lat,
            longitude: lon,
            status: record.status ?? "A",
          };
        })
        .filter((value): value is NonNullable<typeof value> => value !== null);
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
