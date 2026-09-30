import numpy as np
import pandas as pd

from config import Config
from ml import preprocessing as pp
from ml.model_utils import load_model
from services.forecast_service import current_block_forecast
from services.gis_service import filter_locations

_bundle = None


def get_bundle():
    global _bundle
    if _bundle is None:
        _bundle = load_model()
    return _bundle


def status_for(rain_mm: float) -> str:
    return next(s for limit, s in Config.STATUS_BINS if rain_mm < limit)


def predict_panchayat_forecast(district: str, taluka: str, day: str, overrides: dict | None = None) -> list[dict]:
    """Live (or fallback) block forecast for one taluka -> per-Panchayat ML estimates.
    The model itself was trained on synthetic history (see README); only the block-level
    INPUT below is live. Predictions are a prototype estimate, not a validated forecast."""
    b = {**current_block_forecast(district, taluka, day), **(overrides or {})}
    locs = filter_locations(district=district, block=taluka)
    if locs.empty:
        raise LookupError(f"No Panchayats found for '{district}' / '{taluka}'")
    df = pd.DataFrame({"date": pd.Timestamp(day), "panchayat_id": locs["id"].values, "block": taluka,
                       "block_rainfall_forecast": b["rainfall_mm"], "temperature": b["temperature_c"],
                       "humidity": b["humidity_pct"], "wind_speed": b["wind_kmh"]})
    df = pp.create_temporal_features(df)
    df = pp.create_spatial_features(df, locs)
    df = pp.apply_hist_table(pp.create_lag_features(df), get_bundle()["hist"])
    model = get_bundle()["model"]
    rain = np.clip(model.predict(df[pp.FEATURES]), 0, None)
    # Share of trees forecasting measurable rain: an uncalibrated ensemble-agreement score.
    if hasattr(model, "estimators_"):
        X = df[pp.FEATURES].to_numpy()
        prob = np.mean([t.predict(X) >= 2.5 for t in model.estimators_], axis=0)
    else:
        prob = (rain >= 2.5).astype(float)
    out = []
    for r, mm, pr, hist in zip(locs.itertuples(), rain, prob, df["historical_rainfall_mean"]):
        elev_shift = (r.elevation - locs.elevation.mean()) * 0.0065
        out.append({"id": r.id, "name": r.panchayat, "block": r.block, "district": r.district, "state": r.state,
                    "lat": float(r.latitude), "lng": float(r.longitude), "elevation_m": round(float(r.elevation), 1),
                    "elevation_live": bool(r.elevation_live), "block_rainfall_mm": round(b["rainfall_mm"], 1),
                    "rainfall_mm": round(float(mm), 1), "temperature_c": round(b["temperature_c"] - elev_shift, 1),
                    "humidity_pct": int(b["humidity_pct"]), "wind_kmh": round(b["wind_kmh"], 1),
                    "rain_probability_pct": int(round(float(pr) * 100)), "status": status_for(float(mm)),
                    "historical_mean_mm": round(float(hist), 1), "input_source": b["source"], "input_is_live": b["is_live"]})
    return out
