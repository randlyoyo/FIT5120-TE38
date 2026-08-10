export const FALLBACK_SENSORS = [
  { locationId: 1, sensorName: "Bourke Street Mall (North)", latitude: -37.8136, longitude: 144.9648 },
  { locationId: 2, sensorName: "Bourke Street Mall (South)", latitude: -37.814, longitude: 144.9646 },
  { locationId: 3, sensorName: "Melbourne Central", latitude: -37.81, longitude: 144.9633 },
  { locationId: 4, sensorName: "Town Hall (West)", latitude: -37.8155, longitude: 144.9658 },
  { locationId: 5, sensorName: "Princes Bridge", latitude: -37.8183, longitude: 144.9671 },
  { locationId: 6, sensorName: "Flinders Street Station Underpass", latitude: -37.818, longitude: 144.9665 },
  { locationId: 7, sensorName: "State Library", latitude: -37.8098, longitude: 144.9647 },
  { locationId: 8, sensorName: "Southern Cross Station", latitude: -37.8183, longitude: 144.9524 },
  { locationId: 9, sensorName: "QV Market-Elizabeth St (West)", latitude: -37.8075, longitude: 144.9635 },
  { locationId: 10, sensorName: "Chinatown-Swanston St (North)", latitude: -37.8117, longitude: 144.9689 },
  { locationId: 11, sensorName: "Collins Place (South)", latitude: -37.8146, longitude: 144.972 },
  { locationId: 12, sensorName: "Elizabeth St-Lonsdale St (South)", latitude: -37.811, longitude: 144.9633 },
];

export const FALLBACK_QUIET_SPACES = [
  { featureName: "State Library Victoria", theme: "Library", subTheme: "Public Library", latitude: -37.8098, longitude: 144.9647, address: "328 Swanston St, Melbourne" },
  { featureName: "Flagstaff Gardens", theme: "Park", subTheme: "Garden", latitude: -37.8098, longitude: 144.9556, address: "Dudley St, West Melbourne" },
  { featureName: "Carlton Gardens", theme: "Park", subTheme: "Garden", latitude: -37.8049, longitude: 144.9714, address: "Carlton" },
  { featureName: "Treasury Gardens", theme: "Park", subTheme: "Garden", latitude: -37.8129, longitude: 144.9765, address: "Wellington Parade, East Melbourne" },
  { featureName: "Fitzroy Gardens", theme: "Park", subTheme: "Garden", latitude: -37.8114, longitude: 144.9799, address: "Wellington Parade, East Melbourne" },
  { featureName: "NGV International", theme: "Gallery", subTheme: "Art Gallery", latitude: -37.8226, longitude: 144.9689, address: "180 St Kilda Rd, Melbourne" },
];

function hourlyBaseCount(hour: number): number {
  const curve: Record<number, number> = {
    0: 5, 1: 3, 2: 2, 3: 2, 4: 3, 5: 8, 6: 25, 7: 60,
    8: 130, 9: 110, 10: 70, 11: 75, 12: 120, 13: 115, 14: 80,
    15: 85, 16: 95, 17: 140, 18: 125, 19: 70, 20: 45, 21: 30, 22: 18, 23: 10,
  };
  return curve[hour] ?? 20;
}

export function getFallbackSensors() {
  return FALLBACK_SENSORS.map((sensor) => ({ ...sensor, status: "A" as const }));
}

export function getFallbackQuietSpaces() {
  return FALLBACK_QUIET_SPACES.map((space) => ({ ...space }));
}

export function getFallbackDensityForSensor(sensorId: number, hour: number) {
  const sensor = FALLBACK_SENSORS.find((s) => s.locationId === sensorId);
  if (!sensor) return 0;
  const base = hourlyBaseCount(hour);
  const offset = ((sensor.locationId % 5) - 2) * 6;
  return Math.max(0, Math.round(base + offset));
}

