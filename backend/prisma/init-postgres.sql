CREATE TABLE IF NOT EXISTS public.sensors (
  location_id INTEGER PRIMARY KEY,
  sensor_name VARCHAR(191) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'A',
  direction_1 VARCHAR(100),
  direction_2 VARCHAR(100),
  installed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.realtime_counts (
  id SERIAL PRIMARY KEY,
  sensor_id INTEGER NOT NULL REFERENCES public.sensors(location_id),
  sensing_time TIMESTAMP NOT NULL,
  total_count INTEGER NOT NULL,
  direction_1_count INTEGER NOT NULL DEFAULT 0,
  direction_2_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_realtime_counts_sensor_time ON public.realtime_counts(sensor_id, sensing_time);

CREATE TABLE IF NOT EXISTS public.pedestrian_counts (
  id SERIAL PRIMARY KEY,
  sensor_id INTEGER NOT NULL REFERENCES public.sensors(location_id),
  count_date DATE NOT NULL,
  hour_of_day INTEGER NOT NULL,
  pedestrian_count INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pedestrian_counts_sensor_hour ON public.pedestrian_counts(sensor_id, hour_of_day);

CREATE TABLE IF NOT EXISTS public.quiet_spaces (
  id SERIAL PRIMARY KEY,
  feature_name VARCHAR(191) NOT NULL,
  theme VARCHAR(100) NOT NULL,
  sub_theme VARCHAR(100),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address VARCHAR(255)
);
