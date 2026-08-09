import { Router } from "express";
import { getPredictiveAlerts } from "../services/alertsService";

export const alertsRouter = Router();

// GET /api/alerts/predictive - sensors expected to exceed their historical mean+stddev soon (spec 3.6).
alertsRouter.get("/predictive", async (_req, res) => {
  try {
    const alerts = await getPredictiveAlerts();
    res.json(alerts.filter((a) => a.willBeBusy));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to compute predictive alerts" });
  }
});
