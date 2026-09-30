"""Orchestrates: validation -> live-first ML prediction -> status/alerts -> DB log.
All functions are scoped by (district, taluka) — taluka names repeat across districts,
so district is required everywhere except when a global panchayat id is already known
(resolve_id below recovers district+taluka from the id)."""
from datetime import date, timedelta
from functools import lru_cache

from database import db
from ml.predict import get_bundle, predict_panchayat_forecast
from services.advisory_service import generate_advisory
from services.forecast_service import current_block_forecast
from services.gis_service import hierarchy, resolve_id


@lru_cache(maxsize=512)
def _cached(district: str, taluka: str, day: str):
    return tuple(predict_panchayat_forecast(district, taluka, day))


def forecast_for_scope(day: str, district: str | None = None, block: str | None = None) -> list[dict]:
    district = district or "Pune"
    talukas = [block] if block else hierarchy("block", district)
    return [dict(r) for t in talukas for r in _cached(district, t, day)]


def five_day(district: str, taluka: str, pid: str, start: str) -> list[dict]:
    s = date.fromisoformat(start)
    days = [(s + timedelta(i)).isoformat() for i in range(5)]
    out = []
    for d in days:
        rows = _cached(district, taluka, d)
        match = next((r for r in rows if r["id"] == pid), None)
        if not match:
            raise LookupError(f"Unknown Panchayat '{pid}' in {district}/{taluka}")
        out.append({"date": d, **match})
    return out


def alert_for(r: dict, day: str) -> dict | None:
    if r["status"] in ("heavy", "severe"):
        sev, cond = ("high", "Very Heavy Rainfall Expected" if r["status"] == "severe" else "Heavy Rainfall Expected")
    elif r["rain_probability_pct"] >= 70:
        sev, cond = "medium", "High Rain Probability"
    else:
        return None
    return {"id": f"{r['id']}-{day}", "panchayat_id": r["id"], "panchayat": r["name"], "block": r["block"], "district": r["district"],
            "state": r["state"], "date": day, "condition": cond, "severity": sev, "expected_rainfall_mm": r["rainfall_mm"],
            "action": generate_advisory(r["status"], r["rainfall_mm"], r["wind_kmh"])["items"][0]["text"]}


def downscale(district: str, taluka: str, day: str, overrides: dict) -> dict:
    rows = predict_panchayat_forecast(district, taluka, day, overrides)
    ts = db.log_downscaled(rows, day, get_bundle()["version"])
    base = {**current_block_forecast(district, taluka, day), **overrides}
    return {"label": "Live where available (Open-Meteo); Prototype / Demo Data otherwise. ML model is a prototype trained on synthetic history.",
            "block_forecast": {"district": district, "block": taluka, "date": day, **base},
            "panchayat_predictions": rows, "model": get_bundle()["version"], "prediction_timestamp": ts}


def locate_panchayat(pid: str):
    """id -> (district, taluka), or raises LookupError if it doesn't match the real hierarchy."""
    found = resolve_id(pid)
    if not found:
        raise LookupError(f"Unknown Panchayat id: {pid}")
    return found
