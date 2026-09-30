"""Cleaning + feature engineering. The same code path is used for training and inference."""
import numpy as np
import pandas as pd

from services.forecast_service import synthetic_block_forecast as block_forecast

VALID = {"block_rainfall_forecast": (0, 500), "temperature": (-10, 55), "humidity": (0, 100), "wind_speed": (0, 150)}
FEATURES = ["block_rainfall_forecast", "temperature", "humidity", "wind_speed", "latitude", "longitude", "elevation",
            "elevation_vs_block", "historical_rainfall_mean", "block_rain_prev_day", "block_rain_3day_sum", "month", "monsoon"]


def validate_weather_data(df: pd.DataFrame) -> pd.DataFrame:
    """Coerce numerics and drop physically invalid rows."""
    df = df.copy()
    for col, (lo, hi) in VALID.items():
        df[col] = pd.to_numeric(df[col], errors="coerce")
        df.loc[(df[col] < lo) | (df[col] > hi), col] = np.nan
    return df


def preprocess_weather_data(df: pd.DataFrame) -> pd.DataFrame:
    df = validate_weather_data(df)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.drop_duplicates(subset=["date", "panchayat_id"]).dropna(subset=["date", *VALID])
    return df.sort_values(["date", "panchayat_id"]).reset_index(drop=True)


def create_temporal_features(df: pd.DataFrame) -> pd.DataFrame:
    df["month"] = df["date"].dt.month
    df["monsoon"] = df["month"].between(6, 9).astype(int)
    return df


def create_spatial_features(df: pd.DataFrame, locations: pd.DataFrame) -> pd.DataFrame:
    loc = locations.copy()
    loc["elevation_vs_block"] = loc["elevation"] - loc.groupby("block")["elevation"].transform("mean")
    keep = ["id", "latitude", "longitude", "elevation", "elevation_vs_block"]
    return df.merge(loc[keep].rename(columns={"id": "panchayat_id"}), on="panchayat_id", how="left")


def create_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """Previous-day / 3-day block forecast context (only past days, so no leakage)."""
    def lag(block, day, k):
        return block_forecast(block, (day - pd.Timedelta(days=k)).date().isoformat())["rainfall_mm"]
    df["block_rain_prev_day"] = [lag(b, d, 1) for b, d in zip(df["block"], df["date"])]
    df["block_rain_3day_sum"] = [sum(lag(b, d, k) for k in (1, 2, 3)) for b, d in zip(df["block"], df["date"])]
    return df


def build_hist_table(train: pd.DataFrame) -> pd.DataFrame:
    """Historical mean rainfall per Panchayat-month, computed from TRAINING rows only."""
    return train.groupby(["panchayat_id", "month"])["actual_rainfall"].mean().rename("historical_rainfall_mean").reset_index()


def apply_hist_table(df: pd.DataFrame, hist: pd.DataFrame) -> pd.DataFrame:
    df = df.merge(hist, on=["panchayat_id", "month"], how="left")
    fallback = hist.groupby("panchayat_id")["historical_rainfall_mean"].mean()
    df["historical_rainfall_mean"] = df["historical_rainfall_mean"].fillna(df["panchayat_id"].map(fallback))
    return df.fillna({"historical_rainfall_mean": hist["historical_rainfall_mean"].mean()})
