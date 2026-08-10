# FIT5120-TE38 — Sensory-Aware Navigation App

A web app that helps neurodivergent / sensory-sensitive commuters navigate Melbourne CBD
by avoiding high-pedestrian-density corridors, built for FIT5120 Onboarding (UNSDG 11.2/11.7).

**Live:**
- App: https://fit5120-te38-frontend.vercel.app
- API: https://fit5120-te38-backend.vercel.app

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
- Predictive alerts (current hourly rate > historical 95th percentile for this weekday+hour) shown as pulsing map markers and in a dedicated Alerts list, alongside a "busiest right now" ranking
- Data freshness is surfaced everywhere it's shown, not just implied: every reading carries a `data_quality` of `live` / `stale` / `no_live_data` and the UI greys out stale points and labels estimates as such

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

## Database

The database (Postgres, hosted on Neon) is owned and ingested by the team's data pipeline —
this repo's backend is a **read-only consumer** of it, not the ingestion system. It's built on
top of the same City of Melbourne open datasets (`pedestrian-counting-system-sensor-locations`,
`pedestrian-counting-system-monthly-counts-per-hour`, and a landmarks dataset for sensory-refuge
candidates), pre-aggregated into views/materialized views so the backend never has to compute
statistics itself:

| View / table | Used for |
|---|---|
| `v_current_crowding` | Map page — every sensor's current crowding, `sensory_load`, `crowd_level`, `data_quality` |
| `mv_sensor_hour_baseline` | Hour-of-day curves, quiet-window recommendations (US 1.3), predictive alerts (US 2.2) |
| `mv_sensor_sensory_profile` | Route-level sensory scoring (US 1.1) |
| `landmark` + `landmark_category` + `theme` | Sensory-refuge quiet spaces (US 2.1), filtered on `is_sensory_refuge` |
| `ingestion_run`, `pedestrian_minute_count`, `pedestrian_hour_count`, `sensor_location` | `/api/health` pipeline status |

Backend queries live in `backend/src/services/dbQueries.ts` via `@neondatabase/serverless`'s
HTTP-based `neon()` client (no ORM, no TCP pool — the backend runs as Vercel serverless
functions, so each query is a single stateless fetch rather than a persistent connection).

**Rules the backend must not violate** (per the DB owner):
- Always read `data_quality` and reflect it honestly — never show a `stale`/`no_live_data` value as if it were live.
- Join on `location_id`, never `sensor_name` (nullable, can change).
- Don't call the City of Melbourne API directly — read the shared DB instead, to avoid tripping their rate limit.
- Footer must credit `Data © City of Melbourne, licensed under CC BY 4.0`.

**Limitations acknowledged by the DB owner:** only pedestrian volume is modelled (no noise/light
data, so "sensory load" is a proxy); coverage is the 101 CBD sensors only; sensors are points, so
route-to-sensor matching is an approximation, not per-segment ground truth.

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
├── frontend/   React 18 + TypeScript + Vite + React-Leaflet + React Router + lucide-react (Vercel)
└── backend/    Node + Express + TypeScript, deployed as Vercel serverless functions
                (api/index.ts wraps the Express app; @neondatabase/serverless reads the team's Neon Postgres DB over HTTP)
```

## Local development

Prerequisites: Node 18+. No local database to stand up — the backend talks to the team's
shared Neon Postgres instance directly (ask the DB owner for the connection string).

```bash
# 1. backend
cd backend
cp .env.example .env        # fill in DATABASE_URL with the shared connection string
npm install
npm run dev                 # http://localhost:4000

# 2. frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

If the DB has been idle for a few minutes, Neon suspends it — the first request after that has
a few seconds of cold-start latency, then it's normal. If the DB is genuinely unreachable, the
`/api/spaces` and `/api/spaces/sensors` endpoints fall back to a small static in-memory dataset
(`backend/src/services/bootstrapData.ts`) so the frontend still has something to render.

## Deployment

Already live (see links at the top). Both frontend and backend are separate Vercel projects
in the same `TE38` team, both connected to this GitHub repo — **pushing to `main` auto-deploys
both** (no manual `vercel deploy` needed).

**Frontend** (`fit5120-te38-frontend`): root directory `frontend/`, env var
`VITE_API_BASE_URL=https://fit5120-te38-backend.vercel.app/api`. Vite bakes env vars in at
build time, so changing this requires a redeploy (Vercel dashboard → Deployments → Redeploy)
to take effect, not just saving the variable.

**Backend** (`fit5120-te38-backend`): root directory `backend/`, Express preset. The Node
runtime executes `backend/api/index.ts` per request via `vercel.json`'s catch-all rewrite; it
exports the Express app directly rather than calling `.listen()`. Env vars: `DATABASE_URL`
(the shared Neon connection string — ask the DB owner, don't provision a new database),
`CORS_ORIGIN` (the frontend's URL), `OSRM_BASE_URL`.

**Why not Railway (tried first):** the backend was originally deployed on Railway using `pg`'s
TCP driver, which reliably failed to reach Neon (`ETIMEDOUT` / `ENETUNREACH`) — most likely
Railway's `EU West` region having a broken path to Neon's `ap-southeast-2` compute, though we
didn't fully root-cause it (possibly a Neon IP allowlist instead). Moving to Vercel serverless
+ `@neondatabase/serverless`'s HTTP driver (no raw TCP to port 5432 at all) sidestepped the
problem entirely, and better matches the backend's actual shape now that it has no cron jobs
or long-running state left (see Database section above) - so we didn't chase the Railway
networking issue further.

## Known limitations (for the Discovery Presentation "Innovation"/"Code Quality" sections)

- OSRM public demo server is rate-limited; production would self-host OSRM over a Melbourne OSM extract.
- Predictive alerts and quiet-hour recommendations are only as good as `mv_sensor_hour_baseline`'s
  sample size (`n_samples`) for that sensor/weekday/hour — thin samples make for a noisy baseline.
- Nominatim (OSM) geocoding is used client-side for search/autocomplete, bounded to the Melbourne CBD viewbox.
- No public-transport access-point integration yet.
- No formal accessibility/usability testing with neurodivergent users has been conducted yet.
