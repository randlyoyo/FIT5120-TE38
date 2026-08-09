"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedFallbackData = seedFallbackData;
const client_1 = require("@prisma/client");
// Real City of Melbourne pedestrian sensor names/approximate locations (data.melbourne.vic.gov.au
// "Pedestrian Counting System - Sensor Locations"). Seeded directly so the app is demoable without
// depending on the live open-data API being reachable; dataSyncService can refresh/extend this later.
const SENSORS = [
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
const QUIET_SPACES = [
    { featureName: "State Library Victoria", theme: "Library", subTheme: "Public Library", latitude: -37.8098, longitude: 144.9647, address: "328 Swanston St, Melbourne" },
    { featureName: "Flagstaff Gardens", theme: "Park", subTheme: "Garden", latitude: -37.8098, longitude: 144.9556, address: "Dudley St, West Melbourne" },
    { featureName: "Carlton Gardens", theme: "Park", subTheme: "Garden", latitude: -37.8049, longitude: 144.9714, address: "Carlton" },
    { featureName: "Treasury Gardens", theme: "Park", subTheme: "Garden", latitude: -37.8129, longitude: 144.9765, address: "Wellington Parade, East Melbourne" },
    { featureName: "Fitzroy Gardens", theme: "Park", subTheme: "Garden", latitude: -37.8114, longitude: 144.9799, address: "Wellington Parade, East Melbourne" },
    { featureName: "NGV International", theme: "Gallery", subTheme: "Art Gallery", latitude: -37.8226, longitude: 144.9689, address: "180 St Kilda Rd, Melbourne" },
];
// Roughly shapes a weekday commuter crowd curve: quiet overnight, AM/lunch/PM peaks.
function hourlyBaseCount(hour) {
    const curve = {
        0: 5, 1: 3, 2: 2, 3: 2, 4: 3, 5: 8, 6: 25, 7: 60,
        8: 130, 9: 110, 10: 70, 11: 75, 12: 120, 13: 115, 14: 80,
        15: 85, 16: 95, 17: 140, 18: 125, 19: 70, 20: 45, 21: 30, 22: 18, 23: 10,
    };
    return curve[hour] ?? 20;
}
function jitter(base) {
    const variance = base * 0.25;
    return Math.max(0, Math.round(base + (Math.random() * 2 - 1) * variance));
}
async function seedFallbackData(prisma) {
    const sensorCount = await prisma.sensor.count();
    if (sensorCount === 0) {
        console.log("Seeding sensors...");
        for (const s of SENSORS) {
            await prisma.sensor.upsert({
                where: { locationId: s.locationId },
                update: s,
                create: { ...s, status: "A" },
            });
        }
    }
    const quietSpaceCount = await prisma.quietSpace.count();
    if (quietSpaceCount === 0) {
        console.log("Seeding quiet spaces...");
        for (const space of QUIET_SPACES) {
            const existing = await prisma.quietSpace.findFirst({ where: { featureName: space.featureName } });
            if (existing) {
                await prisma.quietSpace.update({
                    where: { id: existing.id },
                    data: space,
                });
            }
            else {
                await prisma.quietSpace.create({ data: space });
            }
        }
    }
    const historicalCount = await prisma.pedestrianCount.count();
    if (historicalCount === 0) {
        console.log("Seeding 14 days of historical hourly counts...");
        const historicalRows = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let daysAgo = 1; daysAgo <= 14; daysAgo++) {
            const date = new Date(today);
            date.setDate(date.getDate() - daysAgo);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            for (const sensor of SENSORS) {
                for (let hour = 0; hour < 24; hour++) {
                    const base = hourlyBaseCount(hour) * (isWeekend ? 0.55 : 1);
                    historicalRows.push({
                        sensorId: sensor.locationId,
                        countDate: date,
                        hourOfDay: hour,
                        pedestrianCount: jitter(base),
                    });
                }
            }
        }
        const chunkSize = 500;
        for (let i = 0; i < historicalRows.length; i += chunkSize) {
            await prisma.pedestrianCount.createMany({ data: historicalRows.slice(i, i + chunkSize) });
        }
    }
    const realtimeCount = await prisma.realtimeCount.count();
    if (realtimeCount === 0) {
        console.log("Seeding current-hour realtime counts...");
        const now = new Date();
        const currentHour = now.getHours();
        const realtimeRows = SENSORS.map((sensor) => {
            const total = jitter(hourlyBaseCount(currentHour));
            const d1 = Math.round(total * 0.55);
            return {
                sensorId: sensor.locationId,
                sensingTime: now,
                totalCount: total,
                direction1Count: d1,
                direction2Count: total - d1,
            };
        });
        await prisma.realtimeCount.createMany({ data: realtimeRows });
    }
}
async function main() {
    const prisma = new client_1.PrismaClient();
    try {
        await seedFallbackData(prisma);
        console.log("Seed complete.");
    }
    finally {
        await prisma.$disconnect();
    }
}
if (require.main === module) {
    main()
        .catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
//# sourceMappingURL=seed.js.map