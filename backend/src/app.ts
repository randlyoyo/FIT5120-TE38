import cors from "cors";
import express from "express";
import { alertsRouter } from "./routes/alerts";
import { heatmapRouter } from "./routes/heatmap";
import { routeRouter } from "./routes/route";
import { spacesRouter } from "./routes/spaces";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
    })
  );
  app.use(express.json());

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/spaces", spacesRouter);
  app.use("/api/heatmap", heatmapRouter);
  app.use("/api/route", routeRouter);
  app.use("/api/alerts", alertsRouter);

  return app;
}
