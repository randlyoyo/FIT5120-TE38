import { getPredictiveAlertRows } from "./dbQueries";

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
 * Spec 3.6: predicts whether each sensor's current reading is expected to
 * become busy within the next hour, using the team DB's precomputed
 * mv_sensor_hour_baseline (avg/p95 per weekday+hour) rather than computing
 * our own statistics.
 */
export async function getPredictiveAlerts(): Promise<PredictiveAlert[]> {
  const rows = await getPredictiveAlertRows();

  return rows.map((r) => ({
    locationId: r.locationId,
    sensorName: r.sensorName,
    latitude: r.latitude,
    longitude: r.longitude,
    currentCount: r.currentHourlyEstimate,
    historicalMean: Math.round(r.historicalAvg),
    historicalStdDev: Math.round(r.historicalP95 - r.historicalAvg),
    willBeBusy: r.willBeBusy,
  }));
}
