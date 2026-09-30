"""Generate the synthetic demo dataset. ALL VALUES ARE PROTOTYPE / DEMO DATA.

locations.csv       Panchayat point locations (approximate sample coordinates, not official)
weather_history.csv Daily block forecast + synthetic 'actual' Panchayat rainfall
Run:  python data/generate_demo_data.py
"""
import sys
import zlib
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from services.forecast_service import synthetic_block_forecast as block_forecast  # noqa: E402

OUT = Path(__file__).parent / "demo"
# id, panchayat, block, district, lat, lon, elevation_m
ROWS = [
    ("kanheri", "Kanheri", "Baramati", "Pune", 18.19, 74.56, 548), ("jalochi", "Jalochi", "Baramati", "Pune", 18.16, 74.61, 556),
    ("medad", "Medad", "Baramati", "Pune", 18.13, 74.55, 572), ("nimbut", "Nimbut", "Baramati", "Pune", 18.21, 74.63, 541),
    ("songaon", "Songaon", "Baramati", "Pune", 18.11, 74.60, 563), ("gunawadi", "Gunawadi", "Baramati", "Pune", 18.17, 74.50, 589),
    ("pandare", "Pandare", "Baramati", "Pune", 18.23, 74.58, 552), ("korhale", "Korhale", "Baramati", "Pune", 18.14, 74.66, 545),
    ("lasalgaon", "Lasalgaon", "Niphad", "Nashik", 20.14, 74.24, 590), ("pimpalgaon", "Pimpalgaon Baswant", "Niphad", "Nashik", 20.17, 73.98, 620),
    ("vinchur", "Vinchur", "Niphad", "Nashik", 20.05, 74.27, 575), ("ozar", "Ozar", "Niphad", "Nashik", 20.09, 73.94, 640),
    ("shendurni", "Shendurni", "Jamner", "Jalgaon", 20.70, 75.80, 340), ("pahur", "Pahur", "Jamner", "Jalgaon", 20.77, 75.63, 385),
    ("neri", "Neri", "Jamner", "Jalgaon", 20.71, 75.75, 360), ("lohara", "Lohara", "Jamner", "Jalgaon", 20.90, 75.84, 310),
]
START, END = date(2024, 6, 1), date(2026, 9, 30)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    loc = pd.DataFrame(ROWS, columns=["id", "panchayat", "block", "district", "latitude", "longitude", "elevation"])
    loc.insert(2, "state", "Maharashtra")
    loc.to_csv(OUT / "locations.csv", index=False)
    loc["rel"] = loc.elevation - loc.groupby("block").elevation.transform("mean")
    micro = {r.id: np.random.RandomState(zlib.crc32(r.id.encode()) % 2**32).uniform(-0.18, 0.18) for r in loc.itertuples()}
    recs = []
    for i in range((END - START).days + 1):
        day = (START + timedelta(i)).isoformat()
        for r in loc.itertuples():
            b = block_forecast(r.block, day)
            rng = np.random.RandomState(zlib.crc32(f"{r.id}|{day}".encode()) % 2**32)
            factor = 1 + 0.0018 * r.rel + micro[r.id]
            actual = max(0.0, b["rainfall_mm"] * factor * rng.lognormal(0, 0.15)) if b["rainfall_mm"] > 0 else 0.0
            recs.append((day, r.id, r.block, b["rainfall_mm"], b["temperature_c"], b["humidity_pct"], b["wind_kmh"], round(actual, 1)))
    cols = ["date", "panchayat_id", "block", "block_rainfall_forecast", "temperature", "humidity", "wind_speed", "actual_rainfall"]
    pd.DataFrame(recs, columns=cols).to_csv(OUT / "weather_history.csv", index=False)
    print(f"wrote {len(loc)} locations, {len(recs)} history rows (Prototype / Demo Data)")


if __name__ == "__main__":
    main()
