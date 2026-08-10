import { Router } from "express";
import { getPipelineHealth } from "../services/dbQueries";

export const healthRouter = Router();

// GET /api/health - is the team's data pipeline still alive? (Q8 in 查询语句.sql)
healthRouter.get("/", async (_req, res) => {
  try {
    const health = await getPipelineHealth();
    res.json({ status: "ok", ...health });
  } catch (err) {
    res.status(503).json({ status: "db_unavailable", error: (err as Error).message });
  }
});
