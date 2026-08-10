import { pool } from "../models";

export type DataQuality = "live" | "stale" | "no_live_data";
export type CrowdLevel = "low" | "medium" | "high";

export interface CurrentCrowding {
  locationId: number;
  sensorName: string;
  sensorDescription: string | null;
  latitude: number;
  longitude: number;
  lastReadingTs: string | null;
  displayCountPerMinute: number;
  crowdLevel: CrowdLevel;
  sensoryLoad: number | null;
  dataQuality: DataQuality;
}

/** Q1 - map page: every sensor + its current crowding, direct from the team DB view. */
export async function getCurrentCrowding(): Promise<CurrentCrowding[]> {
  const { rows } = await pool.query(
    `SELECT location_id,
            sensor_name,
            sensor_description,
            latitude,
            longitude,
            display_count_per_minute,
            crowd_level,
            sensory_load,
            data_quality,
            last_reading_ts
     FROM v_current_crowding
     ORDER BY location_id`
  );
  return rows.map((r) => ({
    locationId: r.location_id,
    sensorName: r.sensor_name,
    sensorDescription: r.sensor_description,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    lastReadingTs: r.last_reading_ts,
    displayCountPerMinute: r.display_count_per_minute,
    crowdLevel: r.crowd_level,
    sensoryLoad: r.sensory_load,
    dataQuality: r.data_quality,
  }));
}

export interface HourBaselinePoint {
  hourOfDay: number;
  avgTotal: number;
  medianTotal: number;
  p95Total: number;
  crowdLevel: CrowdLevel;
}

/** Q2 - a sensor's expected pedestrian count per hour today, for the "when is it quiet" chart. */
export async function getHourBaselineToday(locationId: number): Promise<HourBaselinePoint[]> {
  const { rows } = await pool.query(
    `SELECT b.hour_of_day,
            b.avg_total,
            b.median_total,
            b.p95_total,
            crowd_level_hour(b.avg_total) AS crowd_level
     FROM mv_sensor_hour_baseline b
     WHERE b.location_id = $1
       AND b.day_of_week = EXTRACT(ISODOW FROM (now() AT TIME ZONE 'Australia/Melbourne'))::SMALLINT
     ORDER BY b.hour_of_day`,
    [locationId]
  );
  return rows.map((r) => ({
    hourOfDay: r.hour_of_day,
    avgTotal: r.avg_total,
    medianTotal: r.median_total,
    p95Total: r.p95_total,
    crowdLevel: r.crowd_level,
  }));
}

export interface QuietWindow {
  hourOfDay: number;
  avgTotal: number;
  crowdLevel: CrowdLevel;
}

/** Q3 (US 1.3) - the quietest hours for a sensor on a given ISO day-of-week (1=Mon..7=Sun). */
export async function getQuietWindows(locationId: number, dayOfWeek: number): Promise<QuietWindow[]> {
  const { rows } = await pool.query(
    `SELECT hour_of_day,
            avg_total,
            crowd_level_hour(avg_total) AS crowd_level
     FROM mv_sensor_hour_baseline
     WHERE location_id = $1
       AND day_of_week = $2
       AND hour_of_day BETWEEN 6 AND 22
     ORDER BY avg_total ASC
     LIMIT 3`,
    [locationId, dayOfWeek]
  );
  return rows.map((r) => ({ hourOfDay: r.hour_of_day, avgTotal: r.avg_total, crowdLevel: r.crowd_level }));
}

export interface RouteSensoryScore {
  routeSensoryLoad: number;
  worstSegmentLoad: number;
  routeSensoryRating: CrowdLevel;
  segmentsScored: number;
}

/** Q4 (US 1.1) - overall sensory score for a route, given the sensor ids it passes near. */
export async function getRouteSensoryScore(locationIds: number[]): Promise<RouteSensoryScore | null> {
  if (locationIds.length === 0) return null;
  const { rows } = await pool.query(
    `WITH route AS (
       SELECT unnest($1::INTEGER[]) AS location_id
     )
     SELECT ROUND(AVG(p.sensory_load))::INTEGER AS route_sensory_load,
            MAX(p.sensory_load)                 AS worst_segment_load,
            CASE WHEN AVG(p.sensory_load) <= 33 THEN 'low'
                 WHEN AVG(p.sensory_load) <= 66 THEN 'medium'
                 ELSE 'high' END                AS route_sensory_rating,
            COUNT(*)                            AS segments_scored
     FROM route r
     JOIN mv_sensor_sensory_profile p USING (location_id)`,
    [locationIds]
  );
  const r = rows[0];
  if (!r || r.segments_scored === "0") return null;
  return {
    routeSensoryLoad: r.route_sensory_load,
    worstSegmentLoad: r.worst_segment_load,
    routeSensoryRating: r.route_sensory_rating,
    segmentsScored: Number(r.segments_scored),
  };
}

/** Q5 (US 1.2) - currently-crowded sensors, to penalise in route planning. */
export async function getSensorsToAvoid(): Promise<CurrentCrowding[]> {
  const { rows } = await pool.query(
    `SELECT location_id, sensor_name, latitude, longitude,
            display_count_per_minute, sensory_load
     FROM v_current_crowding
     WHERE crowd_level = 'high'
     ORDER BY display_count_per_minute DESC`
  );
  return rows.map((r) => ({
    locationId: r.location_id,
    sensorName: r.sensor_name,
    sensorDescription: null,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    lastReadingTs: null,
    displayCountPerMinute: r.display_count_per_minute,
    crowdLevel: "high",
    sensoryLoad: r.sensory_load,
    dataQuality: "live",
  }));
}

export interface SensorLocation {
  locationId: number;
  sensorName: string;
  latitude: number;
  longitude: number;
  status: string;
}

/**
 * All non-retired sensors, for the base map layer (spaces/sensors endpoint).
 * Matches v_current_crowding's own filter (status <> 'R') - the real data uses
 * 'unknown' rather than an 'A'/active flag, so status can't be used as an allowlist.
 */
export async function getAllSensors(): Promise<SensorLocation[]> {
  const { rows } = await pool.query(
    `SELECT location_id, sensor_name, latitude, longitude, status
     FROM sensor_location
     WHERE status <> 'R'
     ORDER BY location_id`
  );
  return rows.map((r) => ({
    locationId: r.location_id,
    sensorName: r.sensor_name,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    status: r.status,
  }));
}

export interface SensoryRefuge {
  landmarkId: number;
  featureName: string;
  themeName: string;
  subTheme: string;
  latitude: number;
  longitude: number;
  distanceMetres: number;
}

/** Every sensory-refuge landmark (no distance context), for the quiet-spaces map/list view. */
export async function getAllSensoryRefuges(): Promise<Omit<SensoryRefuge, "distanceMetres">[]> {
  const { rows } = await pool.query(
    `SELECT l.landmark_id,
            l.feature_name,
            t.theme_name,
            c.sub_theme,
            l.latitude,
            l.longitude
     FROM landmark l
     JOIN landmark_category c ON c.category_id = l.category_id
     JOIN theme t             ON t.theme_id    = c.theme_id
     WHERE c.is_sensory_refuge
     ORDER BY l.feature_name`
  );
  return rows.map((r) => ({
    landmarkId: Number(r.landmark_id),
    featureName: r.feature_name,
    themeName: r.theme_name,
    subTheme: r.sub_theme,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
  }));
}

/** Q6 (US 2.1) - nearest sensory-refuge landmarks to a point, planar-distance approximation. */
export async function getNearestRefuges(lat: number, lon: number, limit = 5): Promise<SensoryRefuge[]> {
  const { rows } = await pool.query(
    `SELECT l.landmark_id,
            l.feature_name,
            t.theme_name,
            c.sub_theme,
            l.latitude,
            l.longitude,
            ROUND((
                111320 * SQRT(
                    POWER(l.latitude - $1, 2) +
                    POWER((l.longitude - $2) * COS(RADIANS($1)), 2)
                )
            )::NUMERIC) AS distance_metres
     FROM landmark l
     JOIN landmark_category c ON c.category_id = l.category_id
     JOIN theme t             ON t.theme_id    = c.theme_id
     WHERE c.is_sensory_refuge
     ORDER BY distance_metres
     LIMIT $3`,
    [lat, lon, limit]
  );
  return rows.map((r) => ({
    landmarkId: Number(r.landmark_id),
    featureName: r.feature_name,
    themeName: r.theme_name,
    subTheme: r.sub_theme,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    distanceMetres: Number(r.distance_metres),
  }));
}

export interface ForecastPoint {
  forecastTsLocal: string;
  expectedCountPerHour: number;
  expectedCrowdLevel: CrowdLevel;
  basedOnNObservations: number;
}

/** Q7 (US 2.2) - predictive crowding for a sensor over the next N hours. */
export async function getForecast(locationId: number, hoursAhead: number): Promise<ForecastPoint[]> {
  const { rows } = await pool.query(
    `WITH horizon AS (
       SELECT generate_series(0, $2::int) AS h
     ),
     now_local AS (
       SELECT (now() AT TIME ZONE 'Australia/Melbourne') AS ts
     )
     SELECT (n.ts + make_interval(hours => h.h))::TIMESTAMP AS forecast_ts_local,
            b.avg_total                                     AS expected_count_per_hour,
            crowd_level_hour(b.avg_total)                   AS expected_crowd_level,
            b.n_samples                                      AS based_on_n_observations
     FROM horizon h
     CROSS JOIN now_local n
     JOIN mv_sensor_hour_baseline b
       ON b.location_id = $1
      AND b.day_of_week = EXTRACT(ISODOW FROM (n.ts + make_interval(hours => h.h)))::SMALLINT
      AND b.hour_of_day = EXTRACT(HOUR   FROM (n.ts + make_interval(hours => h.h)))::SMALLINT
     ORDER BY forecast_ts_local`,
    [locationId, hoursAhead]
  );
  return rows.map((r) => ({
    forecastTsLocal: r.forecast_ts_local,
    expectedCountPerHour: r.expected_count_per_hour,
    expectedCrowdLevel: r.expected_crowd_level,
    basedOnNObservations: Number(r.based_on_n_observations),
  }));
}

export interface PipelineHealth {
  latestLiveReading: string | null;
  liveRowsLastHour: number;
  latestHistoricalDate: string | null;
  sensorsKnown: number;
  lastIngestionStatus: string | null;
  lastIngestionAt: string | null;
}

/** Q8 - is the team's ingestion pipeline still alive? */
export async function getPipelineHealth(): Promise<PipelineHealth> {
  const { rows } = await pool.query(
    `SELECT (SELECT MAX(sensing_ts) FROM pedestrian_minute_count)        AS latest_live_reading,
            (SELECT COUNT(*) FROM pedestrian_minute_count
              WHERE sensing_ts > now() - INTERVAL '1 hour')              AS live_rows_last_hour,
            (SELECT MAX(sensing_date) FROM pedestrian_hour_count)        AS latest_historical_date,
            (SELECT COUNT(*) FROM sensor_location)                       AS sensors_known,
            (SELECT status FROM ingestion_run
              ORDER BY started_at DESC LIMIT 1)                          AS last_ingestion_status,
            (SELECT started_at FROM ingestion_run
              ORDER BY started_at DESC LIMIT 1)                          AS last_ingestion_at`
  );
  const r = rows[0];
  return {
    latestLiveReading: r.latest_live_reading,
    liveRowsLastHour: Number(r.live_rows_last_hour),
    latestHistoricalDate: r.latest_historical_date,
    sensorsKnown: Number(r.sensors_known),
    lastIngestionStatus: r.last_ingestion_status,
    lastIngestionAt: r.last_ingestion_at,
  };
}

export interface PredictiveAlertRow {
  locationId: number;
  sensorName: string;
  latitude: number;
  longitude: number;
  currentHourlyEstimate: number;
  historicalAvg: number;
  historicalP95: number;
  willBeBusy: boolean;
}

/**
 * Spec 3.6 - flags sensors whose current reading (annualised to an hourly rate)
 * already exceeds the historical 95th percentile for this weekday+hour, using
 * mv_sensor_hour_baseline.p95_total as the "expected to become busy" threshold
 * instead of a hand-rolled mean+stddev query.
 */
export async function getPredictiveAlertRows(): Promise<PredictiveAlertRow[]> {
  const { rows } = await pool.query(
    `SELECT c.location_id,
            c.sensor_name,
            c.latitude,
            c.longitude,
            c.display_count_per_minute * 60 AS current_hourly_estimate,
            b.avg_total,
            b.p95_total
     FROM v_current_crowding c
     LEFT JOIN mv_sensor_hour_baseline b
       ON b.location_id = c.location_id
      AND b.day_of_week = EXTRACT(ISODOW FROM (now() AT TIME ZONE 'Australia/Melbourne'))::SMALLINT
      AND b.hour_of_day = EXTRACT(HOUR FROM (now() AT TIME ZONE 'Australia/Melbourne'))::SMALLINT
     ORDER BY c.location_id`
  );
  return rows.map((r) => {
    const currentHourlyEstimate = Number(r.current_hourly_estimate ?? 0);
    const historicalAvg = Number(r.avg_total ?? 0);
    const historicalP95 = Number(r.p95_total ?? 0);
    return {
      locationId: r.location_id,
      sensorName: r.sensor_name,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      currentHourlyEstimate,
      historicalAvg,
      historicalP95,
      willBeBusy: historicalP95 > 0 && currentHourlyEstimate > historicalP95,
    };
  });
}
