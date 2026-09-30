"""Block(taluka)-level forecast source: real live data first, synthetic fallback second.

`current_block_forecast` is what runtime routes should call: it tries Open-Meteo live
weather for the requested taluka and date, and falls back to the deterministic synthetic
generator — clearly labelled either way — if the date is outside the live window or the
live API can't be reached. `synthetic_block_forecast` is also used directly by the ML
training pipeline, which needs a long, reproducible historical series that no free live API
can provide.
"""
import zlib
from datetime import date as Date, timedelta
from functools import lru_cache

import numpy as np

from services.gis_service import taluka_point
from services.live_weather_service import LiveDataUnavailable, OutOfLiveRange, live_block_forecast


@lru_cache(maxsize=None)
def synthetic_block_forecast(block: str, day: str) -> dict:
    """Deterministic synthetic generator. Prototype / Demo Data — used for ML training
    history and as the offline fallback when live data can't be reached."""
    d = Date.fromisoformat(day)
    rng = np.random.RandomState(zlib.crc32(f"{block}|{day}".encode()) % (2**32))
    monsoon = 6 <= d.month <= 9
    rain = float(rng.gamma(1.6, 20 if monsoon else 3)) if rng.rand() < (0.75 if monsoon else 0.12) else 0.0
    temp = 33 - 5 * monsoon - min(rain, 40) * 0.08 + rng.normal(0, 1.2)
    hum = np.clip(50 + 25 * monsoon + min(rain, 60) * 0.4 + rng.normal(0, 4), 25, 99)
    wind = max(2.0, rng.normal(14 if monsoon else 9, 4))
    return {"date": day, "rainfall_mm": round(rain, 1), "temperature_c": round(temp, 1),
            "humidity_pct": int(round(float(hum))), "wind_kmh": round(wind, 1),
            "source": "synthetic-demo", "is_live": False}


def block_forecast_series(block: str, start: str, days: int) -> list[dict]:
    """Synthetic history/series — used by ML training, not by live routes."""
    s = Date.fromisoformat(start)
    return [synthetic_block_forecast(block, (s + timedelta(i)).isoformat()) for i in range(days)]


def current_block_forecast(district: str, taluka: str, day: str) -> dict:
    """Real Open-Meteo live forecast when the date is within range and the API is
    reachable; otherwise the labelled synthetic fallback. Never mixes the two silently."""
    lat, lon = taluka_point(district, taluka)
    try:
        return live_block_forecast(lat, lon, day)
    except (LiveDataUnavailable, OutOfLiveRange) as e:
        fb = synthetic_block_forecast(taluka, day)
        fb["fallback_reason"] = str(e)
        return fb
