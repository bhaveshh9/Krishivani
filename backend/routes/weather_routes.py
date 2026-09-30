import json

from flask import Blueprint, jsonify, request

from config import Config
from ml.model_utils import METRICS_PATH
from routes.helpers import ApiError, day_param, num, require_block, require_district, scope_args
from services import downscaling_service as ds
from services.advisory_service import generate_advisory
from services.forecast_service import current_block_forecast
from services.gis_service import hierarchy

bp = Blueprint("weather", __name__, url_prefix="/api")
LABEL = Config.DATA_LABEL


def _anomaly(r):
    ratio = r["rainfall_mm"] / max(r["historical_mean_mm"], 0.5)
    return "below_normal" if ratio < 0.5 else "normal" if ratio < 1.5 else "above_normal" if ratio < 3 else "extreme"


def _rows(day, district=None, block=None):
    return [{**r, "anomaly": _anomaly(r)} for r in ds.forecast_for_scope(day, district, block)]


def _summary(rows):
    n = len(rows)
    return {"label": LABEL, "panchayats": n, "blocks": len({r["block"] for r in rows}), "districts": len({r["district"] for r in rows}),
            "avg_rainfall_mm": round(sum(r["rainfall_mm"] for r in rows) / n, 1) if n else 0,
            "heavy_alerts": sum(r["status"] in ("heavy", "severe") for r in rows),
            "high_probability": sum(r["rain_probability_pct"] >= 70 for r in rows),
            "live_inputs": sum(r["input_is_live"] for r in rows),
            "distribution": {s: sum(r["status"] == s for r in rows) for s in ("normal", "moderate", "heavy", "severe")}}


@bp.get("/weather-map")
def weather_map():
    a = scope_args()
    d = day_param(request.args.get("date"))
    return jsonify({"label": LABEL, "date": d, "panchayats": _rows(d, **a)})


@bp.get("/weather-alerts")
def weather_alerts():
    a, d = scope_args(), day_param(request.args.get("date"))
    return jsonify({"label": LABEL, "alerts": [al for r in _rows(d, **a) if (al := ds.alert_for(r, d))]})


@bp.get("/state-summary")
@bp.get("/district-summary")
@bp.get("/block-summary")
def summary():
    return jsonify(_summary(_rows(day_param(request.args.get("date")), **scope_args())))


@bp.get("/panchayat-summary")
def panchayat_summary():
    d, pid = day_param(request.args.get("date")), request.args.get("id")
    district, taluka = ds.locate_panchayat(pid)
    return jsonify(next(r for r in _rows(d, district, taluka) if r["id"] == pid))


@bp.post("/downscale")
def downscale():
    p = request.get_json(silent=True) or {}
    district = require_district(p.get("district"))
    taluka = require_block(district, p.get("block"))
    d = day_param(p.get("date"))
    ov = {}
    for key, name, lo, hi in (("rainfall_mm", "block_rainfall", 0, 500), ("temperature_c", "temperature", -10, 55),
                              ("humidity_pct", "humidity", 0, 100), ("wind_kmh", "wind", 0, 150)):
        if p.get(name) is not None:
            ov[key] = num(p, name, lo, hi)
    if ov:
        ov["is_live"], ov["source"] = False, "manual-override"
    return jsonify(ds.downscale(district, taluka, d, ov))


@bp.post("/advisory")
def advisory():
    p = request.get_json(silent=True) or {}
    status = p.get("status") or _status(num(p, "rainfall_mm", 0, 500))
    if status not in ("normal", "moderate", "heavy", "severe"):
        raise ApiError("invalid 'status'")
    return jsonify(generate_advisory(status, num(p, "rainfall_mm", 0, 500), num(p, "wind_kmh", 0, 150, 0),
                                     str(p.get("language", "en"))[:2], str(p.get("crop", ""))[:30] or None))


def _status(mm):
    from ml.predict import status_for
    return status_for(mm)


@bp.get("/model-performance")
def model_performance():
    if not METRICS_PATH.exists():
        raise ApiError("Model metrics unavailable. Run: python -m ml.train", 503)
    return jsonify(json.loads(METRICS_PATH.read_text()))


@bp.get("/forecast/block")
def forecast_block():
    district = require_district(request.args.get("district") or "Pune")
    block = require_block(district, request.args.get("block") or "Baramati")
    return jsonify({"label": LABEL, "district": district, "block": block,
                    **current_block_forecast(district, block, day_param(request.args.get("date")))})


@bp.get("/forecast/panchayat")
def forecast_panchayat():
    return weather_map()


@bp.get("/forecast/<pid>")
def forecast_one(pid):
    district, taluka = ds.locate_panchayat(pid)
    return jsonify({"label": LABEL, "district": district, "block": taluka,
                    "forecast": ds.five_day(district, taluka, pid, day_param(request.args.get("date")))})


@bp.get("/advisories")
def advisories():
    lang, a = request.args.get("lang", "en")[:2], scope_args()
    groups = {}
    for r in _rows(day_param(request.args.get("date")), **a):
        for item in generate_advisory(r["status"], r["rainfall_mm"], r["wind_kmh"], lang)["items"]:
            g = groups.setdefault(item["key"], {"id": item["key"], "type": item["key"], "title": item["title"], "text": item["text"], "applies_to": []})
            g["applies_to"].append(r["name"])
    return jsonify({"label": LABEL, "disclaimer": generate_advisory("normal", 20, 0, lang)["disclaimer"], "advisories": list(groups.values())})


# ---- Farmer endpoints (simplified payloads; `id` alone resolves district+taluka) ----
def _farmer_row():
    pid, d = request.args.get("id"), day_param(request.args.get("date"))
    if not pid:
        raise ApiError("'id' (Panchayat) is required")
    district, taluka = ds.locate_panchayat(pid)
    return d, ds.five_day(district, taluka, pid, d)


@bp.get("/farmer/weather")
def farmer_weather():
    d, days = _farmer_row()
    return jsonify({"label": LABEL, "today": days[0]})


@bp.get("/farmer/forecast")
def farmer_forecast():
    d, days = _farmer_row()
    return jsonify({"label": LABEL, "days": days})


@bp.get("/farmer/advisory")
def farmer_advisory():
    d, days = _farmer_row()
    t = days[0]
    return jsonify({"label": LABEL, **generate_advisory(t["status"], t["rainfall_mm"], t["wind_kmh"], request.args.get("lang", "en")[:2],
                                                       request.args.get("crop", "")[:30] or None)})


@bp.get("/farmer/alerts")
def farmer_alerts():
    d, days = _farmer_row()
    return jsonify({"label": LABEL, "alerts": [{"date": x["date"], "level": "red" if x["status"] in ("heavy", "severe") else "yellow",
                                                 "status": x["status"], "rainfall_mm": x["rainfall_mm"]}
                                                for x in days if x["status"] != "normal"]})
