import { Router } from "express";
import { planDualRoutes } from "../services/routingService";

export const routeRouter = Router();

// GET /api/route?startLat=&startLon=&endLat=&endLon= - dual-mode fastest vs quietest route (spec 3.3, 3.5).
routeRouter.get("/", async (req, res) => {
  const { startLat, startLon, endLat, endLon } = req.query;
  const nums = [startLat, startLon, endLat, endLon].map(Number);
  if (nums.some((n) => Number.isNaN(n))) {
    return res.status(400).json({ error: "startLat, startLon, endLat, endLon are required numbers" });
  }
  const [sLat, sLon, eLat, eLon] = nums;

  try {
    const result = await planDualRoutes({ lat: sLat, lon: sLon }, { lat: eLat, lon: eLon });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Routing service unavailable", detail: (err as Error).message });
  }
});
