import { prisma } from "../models";
import { getCurrentDensityPerSensor } from "./weightCalculator";

export interface PredictiveAlert {
  locationId: number;
  sensorName: string;
  latitude: number;
  longitude: number;
  currentCount: number;
  historicalMean: number;
  historicalStdDev: number;
  willBeBusy: boolean;
}

/**
 * Spec 3.6: predicts whether each sensor's current reading exceeds
 * historical mean + 1 standard deviation for this weekday+hour, flagging it
 * as "expected to become busy within the next hour".
 */
export async function getPredictiveAlerts(): Promise<PredictiveAlert[]> {
  const now = new Date();
  const hourOfDay = now.getHours();

  const stats = await prisma.$queryRawUnsafe<
    { sensor_id: number; mean: number; stddev: number }[]
  >(
    `SELECT sensor_id, AVG(pedestrian_count) AS mean, STDDEV_POP(pedestrian_count) AS stddev
     FROM pedestrian_counts
     WHERE hour_of_day = ?
     GROUP BY sensor_id`,
    hourOfDay
  );
  const statsBySensor = new Map(stats.map((s) => [s.sensor_id, s]));

  const currentDensities = await getCurrentDensityPerSensor();

  return currentDensities.map((d) => {
    const s = statsBySensor.get(d.locationId);
    const mean = s?.mean ?? 0;
    const stddev = s?.stddev ?? 0;
    return {
      locationId: d.locationId,
      sensorName: d.sensorName,
      latitude: d.latitude,
      longitude: d.longitude,
      currentCount: d.count,
      historicalMean: Math.round(mean),
      historicalStdDev: Math.round(stddev),
      willBeBusy: d.count > mean + stddev && mean > 0,
    };
  });
}
