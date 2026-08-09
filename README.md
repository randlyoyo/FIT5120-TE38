# FIT5120-TE38 — Sensory-Aware Navigation App

A web app that helps neurodivergent / sensory-sensitive commuters navigate Melbourne CBD
by avoiding high-pedestrian-density corridors, built for FIT5120 Onboarding (UNSDG 11.2/11.7).

## What's implemented (Must Have P0+P1)

- **3.1** Map of Melbourne CBD with sensor + quiet-space markers, click-to-set or address-search A/B points
- **3.2** Real-time pedestrian-density heatmap with an on/off switch (green → yellow → red)
- **3.3** Dual-mode routing: fastest vs quietest, quietest scored by pedestrian density along the path
- **3.4** Quiet-space markers (parks/libraries/galleries) with name/address/type popup
- **3.5** Non-blocking crowd alert banner when the quiet route still crosses a high-density hotspot
- **3.6** Predictive alerts (current count > historical mean + 1 std dev) shown as pulsing map markers
- **3.7** `node-cron` jobs pulling City of Melbourne open data every 5 min (realtime) and daily at 2am (historical)

## Real data sources (data.melbourne.vic.gov.au / data.gov.au)

- `pedestrian-counting-system-sensor-locations` — sensor metadata (135 live sensors)
- `pedestrian-counting-system-monthly-counts-per-hour` — hourly pedestrian counts
- `landmarks-and-places-of-interest-including-schools-theatres-health-services-spor` — quiet spaces (parks/libraries/galleries)

**Honesty note:** the hourly-counts dataset is published monthly, not minute-by-minute, so
`realtime_counts` approximates "current" density using the most recently published hour per
sensor rather than true to-the-minute telemetry. `pedestrian_counts` (historical) is genuine.

## Routing approach (documented simplification)

The spec describes a self-hosted OSRM instance with custom edge weights
(`distance × (1 + normalised density)`) solved via Dijkstra. Standing up and maintaining a
self-hosted OSRM graph for the Melbourne extract was out of scope for this iteration, so the
build instead:

1. Requests walking-route alternatives from the public OSRM demo server (`router.project-osrm.org`, foot profile).
2. Scores each alternative by summing nearby sensors' pedestrian counts weighted by proximity.
3. Returns the lowest-scoring alternative as "quietest" and the shortest-duration one as "fastest".

This satisfies the same user-facing behaviour (dual routes, sensory High/Low indicator, crowd
alert) without depending on a self-hosted routing engine. `OSRM_BASE_URL` in `backend/.env` can
be pointed at a self-hosted OSRM instance later without any other code changes.

## Project structure

```
.
├── frontend/   React 18 + TypeScript + Vite + React-Leaflet
├── backend/    Node + Express + TypeScript + Prisma + MySQL
└── docker-compose.yml   local MySQL 8.0
```

## Local development

Prerequisites: Node 18+, Docker Desktop.

```bash
# 1. start MySQL
docker compose up -d mysql

# 2. backend
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy   # applies prisma/migrations
npm run seed                # baseline demo data (safe to re-run)
npm run dev                 # http://localhost:4000

# 3. frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

The seed script inserts a curated baseline of CBD sensors/quiet spaces/14 days of synthetic
history so the app is demoable offline. The cron jobs (or running the sync functions in
`backend/src/services/dataSyncService.ts` manually) then overlay/extend this with live
open-data records — sensor IDs match, so this is a safe upgrade path, not a conflict.

## Deployment (free subdomain — no purchased domain needed)

**Frontend → Vercel** (free, permanent):
1. Import this repo in Vercel, set root directory to `frontend/`.
2. Add env var `VITE_API_BASE_URL=https://<your-backend-url>/api`.
3. Deploy → you get `https://<project>.vercel.app`.

**Backend + MySQL → Railway** (or any Node + MySQL host):
1. New Railway project → add a MySQL plugin → add a service from this repo's `backend/` directory.
2. Set env vars from `backend/.env.example` (`DATABASE_URL` from Railway's MySQL plugin).
3. Build command: `npm install && npx prisma migrate deploy`. Start command: `npm run build && npm start`.
4. Run `npm run seed` once via Railway's shell (or let the cron jobs populate live data).
5. Set `CORS_ORIGIN` to your Vercel URL.

Alternative for the backend: any VM/host running `docker compose up -d mysql` + `npm start`
works identically — Railway is just the fastest path to a public URL without owning infrastructure.

## Known limitations (for the Discovery Presentation "Innovation"/"Code Quality" sections)

- OSRM public demo server is rate-limited; production would self-host OSRM over a Melbourne OSM extract.
- Predictive alerts need several days of historical data per sensor to be meaningful; freshly-synced
  sensors show no alert until `pedestrian_counts` accumulates for that sensor/hour.
- Nominatim (OSM) geocoding is used client-side for address search, bounded to the Melbourne CBD viewbox.
