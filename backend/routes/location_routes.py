from flask import Blueprint, jsonify, request

from routes.helpers import ApiError, require_block, require_district
from services import gis_service as gis

bp = Blueprint("locations", __name__, url_prefix="/api")


@bp.get("/states")
def states():
    return jsonify(gis.hierarchy("state"))


@bp.get("/districts/<state>")
def districts(state):
    if state != "Maharashtra":
        raise ApiError(f"Unknown state: {state}", 404)
    return jsonify(gis.hierarchy("district"))


@bp.get("/blocks/<district>")
def blocks(district):
    return jsonify(gis.hierarchy("block", require_district(district)))


@bp.get("/panchayats/<district>/<block>")
def panchayats(district, block):
    require_block(require_district(district), block)
    df = gis.panchayat_points(district, block)
    return jsonify([{"id": r.id, "name": r.panchayat, "block": r.block, "district": r.district, "lat": r.latitude,
                     "lng": r.longitude, "elevation_m": round(r.elevation, 1), "elevation_live": bool(r.elevation_live)}
                    for r in df.itertuples()])


@bp.get("/locations")
def locations():
    """All Panchayat points for one district (defaults to Pune) — real district/taluka
    names, representative Panchayat points, real elevation where reachable."""
    district = request.args.get("district") or "Pune"
    require_district(district)
    df = gis.filter_locations(district=district)
    return jsonify({"districts": [d["district"] for d in gis.load_maharashtra_districts()],
                    "district": district, "locations": df.drop(columns=["elevation_live"]).to_dict("records"),
                    "geojson": gis.to_geojson(df), "boundaries": gis.load_boundaries(),
                    "label": "Real Maharashtra district/taluka names. Panchayat points are representative "
                             "approximate samples (elevation is live where reachable), not an official Panchayat list."})
