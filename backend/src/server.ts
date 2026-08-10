import "dotenv/config";
import { createApp } from "./app";
import { getPipelineHealth } from "./services/dbQueries";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

app.listen(port, () => {
  console.log(`sensory-nav-backend listening on :${port}`);
  getPipelineHealth()
    .then((health) => console.log("[startup] team DB reachable, ingestion status:", health.lastIngestionStatus))
    .catch((err) => {
      console.error("[startup] team DB unreachable, full error follows:");
      console.error(err);
      if (err && typeof err === "object" && "errors" in err) {
        console.error("[startup] AggregateError sub-errors:", (err as { errors: unknown[] }).errors);
      }
    });
});
