import { getPredictiveAlertRows } from "./dbQueries";

export interface PredictiveAlert {
  locationId: number;
  sensorName: string;
  latitude: number;
  longitude: number;
  currentTypicalCount: number;
  nextHourExpectedCount: number;
  willBeBusy: boolean;
}

/**
 * Spec 3.6/US 2.2: predicts whether each sensor's *next* hour is expected to be busier than
 * this hour's own p95 "busy" bar, using the team DB's precomputed mv_sensor_hour_baseline
 * (avg/p95 per weekday+hour) - see dbQueries.getPredictiveAlertRows for why this is
 * baseline-only rather than blended with a live reading.
 */
export async function getPredictiveAlerts(): Promise<PredictiveAlert[]> {
  const rows = await getPredictiveAlertRows();

  return rows.map((r) => ({
    locationId: r.locationId,
    sensorName: r.sensorName,
    latitude: r.latitude,
    longitude: r.longitude,
    currentTypicalCount: Math.round(r.currentTypicalCount),
    nextHourExpectedCount: Math.round(r.nextHourExpectedCount),
    willBeBusy: r.willBeBusy,
  }));
}
