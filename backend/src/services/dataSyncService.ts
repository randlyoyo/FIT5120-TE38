import axios from "axios";
import cron from "node-cron";
import { prisma } from "../models";

const OPEN_DATA_BASE =
  process.env.MELBOURNE_OPEN_DATA_BASE ??
  "https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets";

const SENSOR_LOCATIONS_DATASET = "pedestrian-counting-system-sensor-locations";
const HOURLY_COUNTS_DATASET = "pedestrian-counting-system-monthly-counts-per-hour";

interface SensorLocationRecord {
  location_id: number;
  sensor_name: string;
  status?: string;
  direction_1?: string;
  direction_2?: string;
  installation_date?: string;
  location?: { lat: number; lon: number };
  latitude?: number;
  longitude?: number;
}

interface HourlyCountRecord {
  location_id: number;
  sensor_name: string;
  sensing_date: string;
  hourday: number;
  pedestriancount: number;
  direction_1?: number;
  direction_2?: number;
}

const API_PAGE_SIZE = 100; // data.melbourne.vic.gov.au (OpenDataSoft v2.1) rejects limit > 100.

async function fetchPage<T>(dataset: string, params: Record<string, unknown>): Promise<T[]> {
  const { data } = await axios.get(`${OPEN_DATA_BASE}/${dataset}/records`, {
    params,
    timeout: 15000,
  });
  return (data.results ?? []) as T[];
}

/** Fetches up to `maxRecords` results, paginating in blocks of API_PAGE_SIZE via offset. */
async function fetchRecords<T>(
  dataset: string,
  params: Record<string, unknown>,
  maxRecords = API_PAGE_SIZE
): Promise<T[]> {
  const all: T[] = [];
  for (let offset = 0; offset < maxRecords; offset += API_PAGE_SIZE) {
    const limit = Math.min(API_PAGE_SIZE, maxRecords - offset);
    const page = await fetchPage<T>(dataset, { ...params, limit, offset });
    all.push(...page);
    if (page.length < limit) break; // no more pages
  }
  return all;
}

/** Upserts sensor metadata (spec 3.7: "同步过程需处理传感器元数据的更新"). */
export async function syncSensors(): Promise<number> {
  const records = await fetchRecords<SensorLocationRecord>(SENSOR_LOCATIONS_DATASET, {}, 200);

  let count = 0;
  for (const r of records) {
    const lat = r.location?.lat ?? r.latitude;
    const lon = r.location?.lon ?? r.longitude;
    if (r.location_id == null || lat == null || lon == null) continue;

    await prisma.sensor.upsert({
      where: { locationId: r.location_id },
      update: {
        sensorName: r.sensor_name,
        latitude: lat,
        longitude: lon,
        status: r.status ?? "A",
        direction1: r.direction_1 ?? null,
        direction2: r.direction_2 ?? null,
      },
      create: {
        locationId: r.location_id,
        sensorName: r.sensor_name,
        latitude: lat,
        longitude: lon,
        status: r.status ?? "A",
        direction1: r.direction_1 ?? null,
        direction2: r.direction_2 ?? null,
        installedAt: r.installation_date ? new Date(r.installation_date) : null,
      },
    });
    count++;
  }
  return count;
}

/**
 * Pulls the most recent hourly counts available from the City of Melbourne
 * open dataset into realtime_counts. NOTE: this public dataset is refreshed
 * monthly rather than minute-by-minute, so this sync approximates
 * "near-real-time" using the latest published hour per sensor - see README
 * for how to point this at a true minute-level feed if one becomes available.
 */
export async function syncRealtimeCounts(): Promise<number> {
  const records = await fetchRecords<HourlyCountRecord>(
    HOURLY_COUNTS_DATASET,
    { order_by: "sensing_date desc, hourday desc" },
    300
  );

  let count = 0;
  for (const r of records) {
    const sensingTime = new Date(r.sensing_date);
    sensingTime.setHours(r.hourday, 0, 0, 0);

    const sensorExists = await prisma.sensor.findUnique({ where: { locationId: r.location_id } });
    if (!sensorExists) continue;

    await prisma.realtimeCount.create({
      data: {
        sensorId: r.location_id,
        sensingTime,
        totalCount: r.pedestriancount ?? 0,
        direction1Count: r.direction_1 ?? 0,
        direction2Count: r.direction_2 ?? 0,
      },
    });
    count++;
  }

  // Trim anything older than 24h to keep the table to "最近 24 小时" per spec 4.
  await prisma.realtimeCount.deleteMany({
    where: { sensingTime: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });

  return count;
}

/** Daily pull of a broader historical window used for trend prediction (spec 3.6/3.7). */
export async function syncHistoricalCounts(daysBack = 90): Promise<number> {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const records = await fetchRecords<HourlyCountRecord>(
    HOURLY_COUNTS_DATASET,
    { where: `sensing_date >= date'${since.toISOString().slice(0, 10)}'` },
    1000
  );

  let count = 0;
  for (const r of records) {
    const sensorExists = await prisma.sensor.findUnique({ where: { locationId: r.location_id } });
    if (!sensorExists) continue;

    const exists = await prisma.pedestrianCount.findFirst({
      where: { sensorId: r.location_id, countDate: new Date(r.sensing_date), hourOfDay: r.hourday },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.pedestrianCount.create({
      data: {
        sensorId: r.location_id,
        countDate: new Date(r.sensing_date),
        hourOfDay: r.hourday,
        pedestrianCount: r.pedestriancount ?? 0,
      },
    });
    count++;
  }
  return count;
}

const QUIET_SPACE_THEMES = ["Community Use", "Recreation", "Parks and Recreation"];
const LANDMARKS_DATASET =
  "landmarks-and-places-of-interest-including-schools-theatres-health-services-spor";

interface LandmarkRecord {
  feature_name: string;
  theme?: string;
  sub_theme?: string;
  co_ordinates?: { lat: number; lon: number };
}

/** Populates quiet_spaces (parks, libraries, galleries) from City of Melbourne open data (spec 3.4). */
export async function syncQuietSpaces(): Promise<number> {
  let count = 0;
  for (const theme of QUIET_SPACE_THEMES) {
    const records = await fetchRecords<LandmarkRecord>(
      LANDMARKS_DATASET,
      { where: `theme="${theme}"` },
      50
    );
    for (const r of records) {
      if (!r.co_ordinates) continue;
      const existing = await prisma.quietSpace.findFirst({ where: { featureName: r.feature_name } });
      if (existing) continue;
      await prisma.quietSpace.create({
        data: {
          featureName: r.feature_name,
          theme: r.theme ?? theme,
          subTheme: r.sub_theme ?? null,
          latitude: r.co_ordinates.lat,
          longitude: r.co_ordinates.lon,
        },
      });
      count++;
    }
  }
  return count;
}

export function startScheduledSync() {
  const realtimeCron = process.env.SYNC_REALTIME_CRON ?? "*/5 * * * *";
  const historicalCron = process.env.SYNC_HISTORICAL_CRON ?? "0 2 * * *";

  cron.schedule(realtimeCron, async () => {
    try {
      const n = await syncRealtimeCounts();
      console.log(`[dataSync] realtime sync ok: ${n} rows`);
    } catch (err) {
      console.error("[dataSync] realtime sync failed", (err as Error).message);
    }
  });

  cron.schedule(historicalCron, async () => {
    try {
      await syncSensors();
      const n = await syncHistoricalCounts();
      console.log(`[dataSync] historical sync ok: ${n} rows`);
    } catch (err) {
      console.error("[dataSync] historical sync failed", (err as Error).message);
    }
  });

  console.log(
    `[dataSync] scheduled realtime="${realtimeCron}" historical="${historicalCron}"`
  );
}
