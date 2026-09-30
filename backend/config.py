import os
from pathlib import Path

BASE = Path(__file__).parent
_env = BASE / ".env"
if _env.exists():  # tiny .env loader, avoids an extra dependency
    for line in _env.read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


class Config:
    MH_DISTRICTS_FILE = BASE / "data" / "demo" / "maharashtra_districts.json"
    DEMO_DIR = BASE / "data" / "demo"
    RAW_DIR = BASE / "data" / "raw"
    MODEL_DIR = BASE / "models"
    DB_PATH = BASE / "database" / "agroscale.db"
    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")]
    DATA_LABEL = "Prototype / Demo Data"
    # Rainfall status thresholds (mm/day), aligned with the frontend legend.
    STATUS_BINS = [(25, "normal"), (45, "moderate"), (60, "heavy"), (1e9, "severe")]
