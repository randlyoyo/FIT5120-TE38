import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createApp } from "./app";
import { seedFallbackData } from "./services/bootstrapData";
import { startScheduledSync, syncHistoricalCounts, syncQuietSpaces, syncRealtimeCounts, syncSensors } from "./services/dataSyncService";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();
const prisma = new PrismaClient();

async function initializeData() {
  try {
    await seedFallbackData(prisma);

    await Promise.allSettled([
      syncSensors(),
      syncQuietSpaces(),
      syncRealtimeCounts(),
      syncHistoricalCounts(90),
    ]);
  } catch (err) {
    console.error("[bootstrap] initial data setup failed", err);
  }
}

app.listen(port, () => {
  console.log(`sensory-nav-backend listening on :${port}`);
  void initializeData();
  startScheduledSync();
});
