"""SQLite for the prototype. Keep SQL simple so PostgreSQL/PostGIS can replace it later."""
import sqlite3
from datetime import datetime, timezone

from config import Config

SCHEMA = """
CREATE TABLE IF NOT EXISTS locations (id TEXT PRIMARY KEY, state TEXT, district TEXT, block TEXT, panchayat TEXT,
  latitude REAL, longitude REAL, elevation REAL);
CREATE TABLE IF NOT EXISTS weather_forecasts (id INTEGER PRIMARY KEY AUTOINCREMENT, location_id TEXT, date TEXT,
  rainfall REAL, temperature REAL, humidity REAL, wind_speed REAL, rain_probability REAL, source TEXT);
CREATE TABLE IF NOT EXISTS downscaled_forecasts (id INTEGER PRIMARY KEY AUTOINCREMENT, location_id TEXT, date TEXT,
  block_forecast REAL, predicted_rainfall REAL, model_version TEXT, prediction_timestamp TEXT);
CREATE TABLE IF NOT EXISTS advisories (id INTEGER PRIMARY KEY AUTOINCREMENT, location_id TEXT, date TEXT,
  risk_level TEXT, advisory_text TEXT, language TEXT);
CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, location_id TEXT, date TEXT,
  severity TEXT, alert_type TEXT, message TEXT);
"""


def connect():
    Config.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(Config.DB_PATH)


def init_db(locations_df):
    with connect() as con:
        con.executescript(SCHEMA)
        con.execute("DELETE FROM locations")
        con.executemany("INSERT INTO locations VALUES (?,?,?,?,?,?,?,?)",
                        locations_df[["id", "state", "district", "block", "panchayat", "latitude", "longitude", "elevation"]].values.tolist())


def log_downscaled(rows: list[dict], day: str, version: str):
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with connect() as con:
        con.executemany("INSERT INTO downscaled_forecasts (location_id,date,block_forecast,predicted_rainfall,model_version,prediction_timestamp) VALUES (?,?,?,?,?,?)",
                        [(r["id"], day, r["block_rainfall_mm"], r["rainfall_mm"], version, ts) for r in rows])
    return ts
