import { Router } from "express";
import { prisma } from "../models";
import { cache, CACHE_KEYS } from "../services/cacheService";

export const spacesRouter = Router();

// GET /api/spaces - all quiet spaces (parks, libraries, galleries) for map markers.
spacesRouter.get("/", async (_req, res) => {
  try {
    const cached = cache.get(CACHE_KEYS.quietSpaces);
    if (cached) return res.json(cached);

    const spaces = await prisma.quietSpace.findMany();
    cache.set(CACHE_KEYS.quietSpaces, spaces, 300);
    res.json(spaces);
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

    const sensors = await prisma.sensor.findMany({ where: { status: "A" } });
    cache.set(CACHE_KEYS.sensors, sensors, 300);
    res.json(sensors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load sensors" });
  }
});
