# FIT5120-TE38 — Sensory-Aware Navigation App

A web app that helps neurodivergent / sensory-sensitive commuters navigate Melbourne CBD
by avoiding high-pedestrian-density corridors, built for FIT5120 Onboarding (UNSDG 11.2/11.7).

**Live:**
- App: https://fit5120-te38-frontend.vercel.app
- API: https://backend-production-056e.up.railway.app

## What's implemented

**Epic 1 — Sensory-Aware Route Planning & Real-Time Navigation**
- Map of Melbourne CBD with sensor + quiet-space markers, search-as-you-type place lookup (Nominatim), "use my location", or tap-to-set A/B points
- Dual-mode routing: fastest vs quietest, quietest scored by real-time pedestrian density along the path, each with a High/Low sensory-load indicator
- Turn-by-turn walking directions (OSRM step/maneuver data → plain-English instructions)
- **User-defined crowd-sensitivity threshold** (Low/Medium/High, persisted locally) - calibrated against the real percentile distribution of Melbourne's own pedestrian-count data, not an arbitrary number (see `backend/src/config/sensitivity.ts`)
- **En-route monitoring**: while a route is active, the app silently re-checks conditions every 90s and offers a one-tap route update if crowding along the current path has gotten worse, or a clearly quieter alternative has appeared
- Non-blocking crowd-alert toast when the quiet route still crosses a high-density hotspot

**Epic 2 — Sensory Environment Monitoring**
- Continuous sensory-load field over the whole map (inverse-distance-weighted spatial interpolation from real sensor readings — green→yellow→red), not a per-icon color, and not a point-density heatmap (see "Sensory field rendering" below for why)
- Quiet-space list/map view (parks, libraries, galleries) with distance-from-you sorting and one-tap "navigate here"
- Predictive alerts (current count > historical mean + 1 std dev) shown as pulsing map markers and in a dedicated Alerts list, alongside a "busiest right now" ranking
- `node-cron` jobs pulling City of Melbourne open data every 5 min (realtime) and daily at 2am (historical)

**Not yet implemented** (see the Epic 1/2 Definitions of Done in the requirements doc):
- Public-transport access-point integration into walking routes
- Formal accessibility/usability testing with neurodivergent users, and formal alert-accuracy validation against city data — these are research/testing tasks, not code

## UI

Responsive dual-layout, icon set from `lucide-react` (no emoji), English-only copy:
- **Desktop (≥900px):** icon rail + docked side panel (Navigate/Quiet Spaces/Alerts/About) + a persistent map, side by side - map never disappears when you switch panels, like a desktop map app
- **Mobile (<900px):** bottom tab bar, each tab a full-screen page; the Map tab is the map itself with a floating search bar and layer toggles

## Sensory field rendering

The pedestrian-density field is **not** `leaflet.heat` (kernel density estimation designed for
thousands of discrete events) and **not** individual coloured icons. It's a custom Leaflet layer
(`frontend/src/components/Map/SensoryFieldLayer.tsx`) doing real inverse-distance-weighted (IDW)
spatial interpolation from each sensor's live reading:

- Distance is computed in real metres and converted to the current zoom's pixel scale, so the
  field looks the same at every zoom level (not a fixed-pixel-radius blob that distorts on zoom).
- Areas with no sensor within ~220m stay transparent (honestly "no data") instead of being
  painted a fake baseline colour.
- It lives inside Leaflet's `overlayPane` (not a plain DOM child of the map container), so it
  inherits Leaflet's own pan/zoom CSS transform and stays visually glued to the map during
  animations without per-frame JS.
- For performance, it samples a small offscreen buffer (viewport ÷ ~12, sources bucketed into a
  spatial hash grid, filtered to the current viewport first) and lets the canvas natively
  bilinear-scale that up — this is what removes jagged cell edges and keeps redraws fast even
  right after a pinch/zoom gesture. Redraws are deferred one frame via `requestAnimationFrame`
  and only fire on `moveend`/`zoomend`, never on every animation frame.

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

1. Requests walking-route alternatives (with turn-by-turn steps) from the public OSRM demo server (`router.project-osrm.org`, foot profile).
2. Scores each alternative by summing nearby sensors' pedestrian counts weighted by proximity.
3. Returns the lowest-scoring alternative as "quietest" and the shortest-duration one as "fastest", both classified High/Low sensory load against the user's chosen sensitivity tier.

This satisfies the same user-facing behaviour (dual routes, sensory High/Low indicator, crowd
alert, turn-by-turn directions) without depending on a self-hosted routing engine. `OSRM_BASE_URL`
in `backend/.env` can be pointed at a self-hosted OSRM instance later without any other code changes.

## Project structure

```
.
├── frontend/   React 18 + TypeScript + Vite + React-Leaflet + React Router + lucide-react
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

## Deployment

Already live (see links at the top). To redeploy or set up your own:

**Frontend → Vercel** (free, permanent):
1. Import this repo in Vercel, set root directory to `frontend/`.
2. Add env var `VITE_API_BASE_URL=https://<your-backend-url>/api`.
3. Deploy → you get `https://<project>.vercel.app`.

**Backend + MySQL → Railway** (or any Node + MySQL host):
1. New Railway project → add a MySQL plugin → add a service from this repo's `backend/` directory.
2. Set env vars from `backend/.env.example` (`DATABASE_URL` from Railway's MySQL plugin).
3. Railway auto-detects the Node build; `postinstall` runs `prisma generate` and `start` runs `prisma migrate deploy` before booting, so a fresh deploy applies the schema automatically.
4. Run `npm run seed` once (e.g. via `railway ssh -- npm run seed`), or let the cron jobs populate live data.
5. Set `CORS_ORIGIN` to your Vercel URL.

The current deployment was pushed via `vercel deploy --prod` / `railway up` directly (not a
GitHub-connected auto-deploy) — pushing to `main` will **not** automatically redeploy either
service yet.

## Known limitations (for the Discovery Presentation "Innovation"/"Code Quality" sections)

- OSRM public demo server is rate-limited; production would self-host OSRM over a Melbourne OSM extract.
- Predictive alerts need several days of historical data per sensor to be meaningful; freshly-synced
  sensors show no alert until `pedestrian_counts` accumulates for that sensor/hour.
- Nominatim (OSM) geocoding is used client-side for search/autocomplete, bounded to the Melbourne CBD viewbox.
- No public-transport access-point integration yet.
- No formal accessibility/usability testing with neurodivergent users has been conducted yet.
