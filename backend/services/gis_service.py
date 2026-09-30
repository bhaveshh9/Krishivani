"""Two location systems, kept deliberately separate:

1. TRAINING fixture (`load_training_locations`) — the original small, fixed set of 16
   Panchayats (Baramati/Niphad/Jamner) used to build the synthetic training dataset in
   `data/generate_demo_data.py` and `ml/train.py`. Unchanged, so the already-trained model
   and its metrics stay reproducible.
2. LIVE Maharashtra hierarchy (`hierarchy`, `panchayat_points`, `filter_locations`) — all 36
   real Maharashtra districts and their real talukas (from Wikipedia's list of talukas of
   Maharashtra), used by every runtime API route. Exact Panchayat-level coordinates for the
   whole state are not freely available to this prototype, so each taluka's Panchayat points
   are representative sample points placed near that taluka (deterministic, reproducible) —
   never fabricated official boundaries, and always labelled "approximate" in API responses.
   Elevation for those points is real (Open-Meteo elevation API), not invented.
"""
import hashlib
import json
from functools import lru_cache

import pandas as pd

from config import Config
from services.geo_slug import make_id, slugify
from services.live_weather_service import LiveDataUnavailable, elevation_m

# Curated real village names for the three talukas used in the original demo/training set —
# reused here so those talukas show real village names instead of generic placeholders.
REAL_VILLAGES = {
    ("Pune", "Baramati"): ["Kanheri", "Jalochi", "Medad", "Nimbut", "Songaon"],
    ("Nashik", "Niphad"): ["Lasalgaon", "Pimpalgaon Baswant", "Vinchur", "Ozar", "Sayyad Pimpri"],
    ("Jalgaon", "Jamner"): ["Shendurni", "Pahur", "Neri", "Lohara", "Waghari"],
}
PANCHAYATS_PER_TALUKA = 5


@lru_cache(maxsize=1)
def load_maharashtra_districts() -> list[dict]:
    return json.loads(Config.MH_DISTRICTS_FILE.read_text())


@lru_cache(maxsize=1)
def _district_by_name() -> dict:
    return {d["district"]: d for d in load_maharashtra_districts()}


def hierarchy(level: str, parent: str | None = None) -> list[str]:
    if level == "state":
        return ["Maharashtra"]
    if level == "district":
        return [d["district"] for d in load_maharashtra_districts()]
    if level == "block":  # "block" = taluka, scoped to one district (names repeat across districts)
        d = _district_by_name().get(parent or "")
        return d["talukas"] if d else []
    raise ValueError(f"Unknown hierarchy level: {level}")


def known_district(name: str) -> dict | None:
    return _district_by_name().get(name)


def known_block(district: str, taluka: str) -> bool:
    d = known_district(district)
    return bool(d and taluka in d["talukas"])


def _offset(seed: str, scale_deg: float) -> tuple[float, float]:
    """Deterministic, reproducible pseudo-random offset in [-scale, scale] on each axis."""
    h = hashlib.sha256(seed.encode()).hexdigest()
    a, b = int(h[:8], 16) / 0xFFFFFFFF, int(h[8:16], 16) / 0xFFFFFFFF
    return (a * 2 - 1) * scale_deg, (b * 2 - 1) * scale_deg


def taluka_point(district: str, taluka: str) -> tuple[float, float]:
    """Approximate taluka location: district HQ + a small deterministic offset."""
    d = known_district(district)
    if not d:
        raise LookupError(f"Unknown district: {district}")
    dlat, dlon = _offset(f"{district}|{taluka}", 0.18)  # ~ up to ~20 km from the district HQ
    return round(d["lat"] + dlat, 4), round(d["lon"] + dlon, 4)


def _fallback_elevation(lat: float, lon: float) -> float:
    """Used only if the live elevation API is unreachable — a rough, clearly-approximate
    stand-in so the app keeps working offline, never presented as a live value."""
    h = hashlib.sha256(f"{lat},{lon}".encode()).hexdigest()
    return round(150 + (int(h[:6], 16) % 10000) / 10, 0)


def panchayat_points(district: str, taluka: str) -> pd.DataFrame:
    """Representative Panchayat-level points for one taluka, with real elevation where the
    live elevation API is reachable (falls back to an approximate estimate if it is not)."""
    if not known_block(district, taluka):
        raise LookupError(f"Unknown taluka '{taluka}' in district '{district}'")
    tlat, tlon = taluka_point(district, taluka)
    names = REAL_VILLAGES.get((district, taluka))
    rows = []
    for i in range(PANCHAYATS_PER_TALUKA):
        olat, olon = _offset(f"{district}|{taluka}|{i}", 0.045)  # ~ up to ~5 km within the taluka
        lat, lon = round(tlat + olat, 4), round(tlon + olon, 4)
        try:
            elev, elev_live = elevation_m(lat, lon), True
        except LiveDataUnavailable:
            elev, elev_live = _fallback_elevation(lat, lon), False
        name = names[i] if names else f"{taluka} Panchayat {i + 1}"
        rows.append({"id": make_id(district, taluka, i), "panchayat": name, "block": taluka, "district": district,
                     "state": "Maharashtra", "latitude": lat, "longitude": lon, "elevation": elev, "elevation_live": elev_live})
    return pd.DataFrame(rows)


def resolve_id(pid: str) -> tuple[str, str] | None:
    """panchayat id -> (district, taluka), by matching its slugs against the real hierarchy."""
    from services.geo_slug import parse_id
    parsed = parse_id(pid)
    if not parsed:
        return None
    dslug, tslug, _ = parsed
    for d in load_maharashtra_districts():
        if slugify(d["district"]) == dslug:
            for t in d["talukas"]:
                if slugify(t) == tslug:
                    return d["district"], t
    return None


def filter_locations(state=None, district=None, block=None) -> pd.DataFrame:
    """Live Maharashtra locations for the given scope. Bounded: a district is required to
    avoid generating points for the whole state in one call; defaults to Pune if omitted."""
    district = district or "Pune"
    if not known_district(district):
        raise LookupError(f"Unknown district: {district}")
    talukas = [block] if block else hierarchy("block", district)
    frames = [panchayat_points(district, t) for t in talukas if known_block(district, t)]
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame(
        columns=["id", "panchayat", "block", "district", "state", "latitude", "longitude", "elevation"])


def to_geojson(df: pd.DataFrame) -> dict:
    feats = [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [r.longitude, r.latitude]},
              "properties": {"id": r.id, "name": r.panchayat, "block": r.block, "district": r.district}}
             for r in df.itertuples()]
    return {"type": "FeatureCollection", "features": feats}


def load_boundaries():
    """Official Panchayat boundary GeoJSON, only if the file has actually been provided."""
    path = Config.RAW_DIR / "panchayat_boundaries.geojson"
    return json.loads(path.read_text()) if path.exists() else None


# ---- Training fixture (unchanged small demo set; see module docstring) ----
@lru_cache(maxsize=1)
def load_training_locations() -> pd.DataFrame:
    return pd.read_csv(Config.DEMO_DIR / "locations.csv")
