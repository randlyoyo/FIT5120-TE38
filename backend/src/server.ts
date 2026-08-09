import "dotenv/config";
import { createApp } from "./app";
import { startScheduledSync } from "./services/dataSyncService";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

app.listen(port, () => {
  console.log(`sensory-nav-backend listening on :${port}`);
  startScheduledSync();
});
