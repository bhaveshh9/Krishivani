# Krishivani — SIH 2026 · Problem Statement 26074

**Downscaling of weather forecast from Block level to Panchayat level for agro-meteorological advisory.**

> **We are downscaling existing weather forecasts; we are not building a new NWP system from scratch.**
> One Block does not always mean one weather condition. Krishivani takes a Block(taluka)-level forecast, adds
> historical and spatial (latitude, longitude, elevation) information, and uses an ML model to estimate
> Panchayat-level weather, then turns it into farmer advisory — for real Maharashtra locations.

## What's real vs. prototype (read this first)
| Part | Status |
|---|---|
| All 36 Maharashtra districts and their 349 real talukas | **Real** (from Wikipedia's list of talukas of Maharashtra) |
| Current/near-future block weather (rain, temp, humidity, wind) | **Real, live** — [Open-Meteo](https://open-meteo.com) public forecast API, for today .. +6 days |
| Elevation per Panchayat point | **Real, live** — Open-Meteo elevation API |
| Panchayat-level ML forecast | Prototype — model is trained on a **synthetic** historical dataset (no real Panchayat rainfall records exist yet) |
| Exact Panchayat point positions within a taluka | Approximate representative samples, not an official Panchayat list |
| Live data for dates outside today..+6 days, or when offline | Falls back to a labelled synthetic value — never silently shown as live |

Every API response says which of these applies (`is_live`, `source`, `elevation_live`, `label` fields). See [Limitations](#limitations).

## Architecture
```
Live block forecast (Open-Meteo, real Maharashtra coords) + synthetic history + real district/taluka hierarchy + live elevation
   → preprocessing → feature engineering → Random Forest downscaling → Panchayat forecast
   → advisory engine → React dashboards (Government / Farmer)
```

| Part | Tech |
|---|---|
| Frontend | TanStack Start + React 19, Tailwind, shadcn/ui, Recharts, **Leaflet + OpenStreetMap** |
| Backend | Python, Flask (`backend/`) |
| Live weather/elevation | [Open-Meteo](https://open-meteo.com) (free, no API key) via `services/live_weather_service.py` |
| ML | pandas, NumPy, scikit-learn (Random Forest; Gradient Boosting switchable), joblib |
| DB | SQLite (`backend/database/`), plain SQL so PostgreSQL/PostGIS can replace it |

## Run it

**Backend** (Python 3.10+, needs internet for live weather — falls back gracefully without it)
```sh
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                    # optional
python data/generate_demo_data.py                       # synthetic training dataset (16-Panchayat fixture)
python -m ml.train                                       # trains model, writes models/metrics.json
python app.py                                             # http://127.0.0.1:5000
```
**Frontend**
```sh
cp .env.example .env        # VITE_API_URL=http://localhost:5000
npm i && npm run dev
```
Login (any demo credentials), then pick **Government / Officer** or **Farmer**. Pick any real district → any real
taluka in it → any of its 5 sample Panchayats. If the backend is unreachable, the UI shows a red **"Backend
offline — Demo Mode"** badge and uses built-in sample data instead.

## Two dashboards
- **/government-dashboard** — real State → District → Taluka → Panchayat filters (all 36 districts), KPI cards,
  Leaflet map with layers (locations, rainfall, temperature, alerts, forecast-vs-actual), detail panel with a
  **● Live / ○ Prototype demo value** tag, **Block → Panchayat Downscaling** flow with staged loading, charts,
  anomaly, alert center.
- **/farmer-dashboard** — simple weather card (with the same live/demo tag), 5-day forecast, risk, advisory,
  alerts, small map; English / हिन्दी / मराठी / ગુજરાતી / தமிழ்; browser location (via the browser's own permission
  prompt) auto-fills district → taluka → nearest sample Panchayat; manual selection always works.
- The original console pages (`/`, `/forecast`, `/map`, `/downscaling`, `/advisory`, `/performance`) are kept and
  read from the same live-first backend, scoped to Pune district / Baramati taluka by default.

## Real Maharashtra location data
`backend/data/demo/maharashtra_districts.json` holds all 36 districts (name, division, headquarters town + real
coordinates) and their real talukas. For any (district, taluka), 5 representative Panchayat points are generated
deterministically near that taluka (same input always gives the same points) and each gets **real elevation**
from Open-Meteo where reachable. Panchayat ids are globally unique slugs (`district__taluka__n`), so a bare id
is enough for any endpoint to resolve its district and taluka — no ambiguity even though taluka names repeat
across districts (e.g. "Karjat" exists in both Raigad and Ahmednagar). Baramati (Pune), Niphad (Nashik) and
Jamner (Jalgaon) use real curated village names; every other taluka uses generic "Taluka Panchayat N" labels
until an official Panchayat list is connected — see [Limitations](#limitations).

## Live weather & elevation
`services/live_weather_service.py` calls Open-Meteo for the requested taluka's approximate coordinates.
- Within **today .. +6 days**: real live/forecast values, cached 15 minutes, tagged `"source": "open-meteo-live"`.
- Outside that window, or if the API can't be reached: falls back to a deterministic **synthetic** generator,
  tagged `"source": "synthetic-demo"` with a `fallback_reason`. The two are never mixed silently.
- Elevation is fetched once per point and cached indefinitely (terrain doesn't change); if unreachable, a clearly
  non-live estimate is used instead (`elevation_live: false`).

## ML method & data-leakage control
- Target: Panchayat-level rainfall. Trained on the original small, fixed 16-Panchayat **synthetic** history
  (Baramati/Niphad/Jamner) — kept separate from the real-time hierarchy above so the trained model stays
  reproducible. Features: block forecast (rain, temp, humidity, wind), lat/lon/elevation, elevation vs block
  mean, historical Panchayat-month mean rainfall, block rain previous day / 3-day sum, month, monsoon flag.
- **Chronological split**: first 70% of dates train, next 15% validation, last 15% test (no shuffling). The
  historical-mean feature is computed from training rows only. Exact date ranges are in `backend/models/metrics.json`.
- At inference time, for *any* real Maharashtra taluka, the live block forecast feeds the same trained model;
  the model itself has not been validated against real Panchayat observations (none exist yet) — see Limitations.
- Metrics: MAE, RMSE, R², mean bias, correlation; rain-event precision/recall/F1/CSI (≥ 25 mm). Baseline = raw
  block forecast. `rain_probability_pct` = share of forest trees predicting ≥ 2.5 mm (an uncalibrated
  ensemble-agreement score, not a probabilistic forecast).

## API (JSON, prefix `/api`)
`GET /health · /states · /districts/{state} · /blocks/{district} · /panchayats/{district}/{block} · /locations?district= ·
/weather-map?district=&block=&date= · /weather-alerts · /state-summary · /district-summary · /block-summary ·
/panchayat-summary?id= · /forecast/block?district=&block=&date= · /forecast/panchayat · /forecast/{id} ·
/advisories · /model-performance · /farmer/weather?id= · /farmer/forecast?id= · /farmer/advisory?id=&lang= ·
/farmer/alerts?id=` and `POST /downscale {district, block, date, block_rainfall?, temperature?, humidity?} ·
/advisory`. Panchayat ids alone resolve their district/taluka; `district` defaults to Pune when omitted from
scope-level endpoints so the initial dashboard load stays bounded.

```json
POST /api/downscale  {"district":"Nashik","block":"Niphad","date":"2026-10-02"}
→ {"block_forecast":{"rainfall_mm":12.4,"is_live":true,"source":"open-meteo-live",...},
   "panchayat_predictions":[{"name":"Lasalgaon","rainfall_mm":14.1,"status":"moderate","elevation_live":true,...}],
   "model":"random_forest-v1"}
```
Inputs are validated (real district/taluka names, date format, numeric ranges); unknown values return JSON
errors. CORS allows only origins in `CORS_ORIGINS`.

## Database (SQLite)
`locations`, `weather_forecasts`, `downscaled_forecasts`, `advisories`, `alerts` (schema in `backend/database/db.py`).
`locations` is seeded from the 16-Panchayat training fixture (not the full live hierarchy, which is generated
on demand); `downscaled_forecasts` is written on every `/api/downscale` call; the rest are created for later use.

## Plugging in real data
- **Official IMD data**: replace `services/live_weather_service.py`'s Open-Meteo calls with an authorized
  IMD/GKMS connector (keys in `backend/.env`) — the rest of the pipeline (fallback, caching, labelling) can stay.
- **Official Panchayat list/boundaries**: drop a real Panchayat CSV or GeoJSON in `backend/data/raw/`, and swap
  `gis_service.panchayat_points()`'s deterministic-offset generator for a real lookup. `/api/locations` already
  returns `boundaries` from `panchayat_boundaries.geojson` if present — no boundaries are fabricated.
- **Real training history**: once real Panchayat rainfall observations exist, retrain on them instead of the
  synthetic fixture and re-run `python -m ml.train`; the chronological-split code needs no changes.

## Limitations
- The ML model is trained on **synthetic** history; live input weather does not make its predictions validated
  — only the block-level input is real, the downscaling itself remains an unvalidated prototype estimate.
- Panchayat point positions (outside Baramati/Niphad/Jamner) are deterministic approximate samples near each
  taluka, not an official Panchayat list — do not present them as exact real coordinates.
- Live weather only covers today .. +6 days (Open-Meteo's window); other dates always use the labelled synthetic
  fallback, by design.
- Crop-specific advisory is not implemented (needs crop-stage/soil data). Forecast-vs-Actual map layer stays
  empty until real observations are connected.
- This sandbox that built the project has no outbound network access, so the live Open-Meteo calls were tested
  only via their offline-fallback path here (confirmed graceful and correctly labelled) — run it with real
  internet to see `is_live: true` responses.
- Translations (Hindi, Marathi, Gujarati, Tamil) are simple, non-native-reviewed wording — have a native speaker
  check them before presenting. Login is a prototype gate; there is no real authentication.
