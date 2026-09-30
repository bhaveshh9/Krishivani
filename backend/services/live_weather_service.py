"""Real-time weather for Maharashtra via Open-Meteo (https://open-meteo.com) — a free,
no-API-key public forecast service. This is genuine live data, not synthetic, but it is
NOT the official IMD/GKMS feed; it stands in for it until an authorized IMD connector is
available (see README). Every value returned here is tagged "source": "open-meteo-live".

Network is required. If the request fails (offline, blocked, rate-limited), callers must
catch LiveDataUnavailable and fall back to the labelled synthetic generator — never silently
show a stale or fabricated number as live.
"""
import json
import time
from datetime import date as Date
from pathlib import Path

import requests

from config import Config

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
ELEVATION_URL = "https://api.open-meteo.com/v1/elevation"
TIMEOUT = 6
CACHE_PATH = Config.DEMO_DIR.parent / "processed" / "live_cache.json"
WEATHER_TTL_SEC = 15 * 60  # Open-Meteo updates hourly; no need to re-fetch more often than this


class LiveDataUnavailable(Exception):
    """Network/API failure. Caller must fall back, never fabricate a 'live' value."""


class OutOfLiveRange(Exception):
    """The requested date is outside Open-Meteo's forecast window (today .. +6 days)."""


def _cache_load() -> dict:
    try:
        return json.loads(CACHE_PATH.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _cache_save(cache: dict) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(cache))


def _get(url: str, params: dict) -> dict:
    try:
        r = requests.get(url, params=params, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()
    except (requests.RequestException, ValueError) as e:
        raise LiveDataUnavailable(f"{url} failed: {e}") from e


def elevation_m(lat: float, lon: float) -> float:
    """Real elevation (metres) for a point, cached indefinitely (terrain doesn't change)."""
    key = f"elev:{round(lat, 3)},{round(lon, 3)}"
    cache = _cache_load()
    if key in cache:
        return cache[key]
    data = _get(ELEVATION_URL, {"latitude": lat, "longitude": lon})
    value = float(data["elevation"][0])
    cache[key] = value
    _cache_save(cache)
    return value


def live_block_forecast(lat: float, lon: float, day: str) -> dict:
    """Real live/forecast weather for (lat, lon) on `day`. Raises OutOfLiveRange if `day`
    is not within Open-Meteo's ~7-day forecast window, LiveDataUnavailable on network failure."""
    target = Date.fromisoformat(day)
    delta = (target - Date.today()).days
    if not (0 <= delta <= 6):
        raise OutOfLiveRange(f"{day} is outside the live forecast window (today .. +6 days)")

    key = f"fc:{round(lat, 3)},{round(lon, 3)},{day}"
    cache = _cache_load()
    hit = cache.get(key)
    if hit and time.time() - hit["ts"] < WEATHER_TTL_SEC:
        return hit["value"]

    data = _get(FORECAST_URL, {
        "latitude": lat, "longitude": lon, "timezone": "Asia/Kolkata", "forecast_days": 7,
        "daily": "precipitation_sum,temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,wind_speed_10m_max",
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation",
    })
    daily = data["daily"]
    idx = daily["time"].index(day)
    if delta == 0 and "current" in data:
        cur = data["current"]
        temp, hum, wind = cur["temperature_2m"], cur["relative_humidity_2m"], cur["wind_speed_10m"]
    else:
        temp = (daily["temperature_2m_max"][idx] + daily["temperature_2m_min"][idx]) / 2
        hum, wind = daily["relative_humidity_2m_mean"][idx], daily["wind_speed_10m_max"][idx]
    value = {"date": day, "rainfall_mm": round(daily["precipitation_sum"][idx] or 0.0, 1),
             "temperature_c": round(temp, 1), "humidity_pct": int(round(hum)), "wind_kmh": round(wind, 1),
             "source": "open-meteo-live", "is_live": True}
    cache[key] = {"ts": time.time(), "value": value}
    _cache_save(cache)
    return value
