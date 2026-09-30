"""Train + evaluate the downscaling model with a CHRONOLOGICAL split (no future leakage).

Run:  python -m ml.train [random_forest|gradient_boosting]
"""
import json
import sys

import pandas as pd

from config import Config
from ml import preprocessing as pp
from ml.model_utils import METRICS_PATH, event_metrics, make_model, regression_metrics, save_model
from services.gis_service import load_training_locations as load_locations


def load_dataset() -> pd.DataFrame:
    raw = pd.read_csv(Config.DEMO_DIR / "weather_history.csv")
    if raw.empty:
        raise ValueError("Empty dataset")
    df = pp.preprocess_weather_data(raw)
    df = pp.create_temporal_features(df)
    df = pp.create_spatial_features(df, load_locations())
    return pp.create_lag_features(df)


def chronological_split(df: pd.DataFrame, train=0.70, val=0.15):
    dates = sorted(df["date"].unique())
    a, b = dates[int(len(dates) * train)], dates[int(len(dates) * (train + val))]
    return df[df.date < a], df[(df.date >= a) & (df.date < b)], df[df.date >= b]


def evaluate_model(model, df, cols) -> dict:
    pred = model.predict(df[cols]).clip(min=0)
    return {"proposed": {**regression_metrics(df.actual_rainfall, pred), **event_metrics(df.actual_rainfall, pred)},
            "baseline": {**regression_metrics(df.actual_rainfall, df.block_rainfall_forecast),
                         **event_metrics(df.actual_rainfall, df.block_rainfall_forecast)}}


def train_model(name: str = "random_forest") -> dict:
    df = load_dataset()
    train, val, test = chronological_split(df)
    hist = pp.build_hist_table(train)
    train, val, test = (pp.apply_hist_table(x, hist) for x in (train, val, test))
    model = make_model(name).fit(train[pp.FEATURES], train.actual_rainfall)
    rng = lambda x: [str(x.date.min().date()), str(x.date.max().date())]  # noqa: E731
    metrics = {"validation": evaluate_model(model, val, pp.FEATURES), "test": evaluate_model(model, test, pp.FEATURES),
               "meta": {"model": name, "data_source": "synthetic_demo", "label": "Prototype metrics on synthetic demo data. Not real-world accuracy.",
                        "split": {"train": rng(train), "validation": rng(val), "test": rng(test)},
                        "rows": {"train": len(train), "validation": len(val), "test": len(test)}}}
    save_model({"model": model, "features": pp.FEATURES, "hist": hist, "name": name, "version": f"{name}-v1"})
    METRICS_PATH.write_text(json.dumps(metrics, indent=2))
    return metrics


if __name__ == "__main__":
    m = train_model(sys.argv[1] if len(sys.argv) > 1 else "random_forest")
    print(json.dumps({"test": m["test"]["proposed"], "baseline": m["test"]["baseline"], "split": m["meta"]["split"]}, indent=2))
