from datetime import date

from flask import request

from services.gis_service import hierarchy, known_block, known_district


class ApiError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.message, self.status = message, status


def num(payload, key, lo, hi, default=None):
    v = payload.get(key, default)
    if v is None:
        raise ApiError(f"'{key}' is required")
    try:
        v = float(v)
    except (TypeError, ValueError):
        raise ApiError(f"'{key}' must be a number")
    if not lo <= v <= hi:
        raise ApiError(f"'{key}' must be between {lo} and {hi}")
    return v


def day_param(value=None) -> str:
    try:
        return date.fromisoformat(value or date.today().isoformat()).isoformat()
    except (TypeError, ValueError):
        raise ApiError("'date' must be YYYY-MM-DD")


def require_district(value) -> str:
    if not value:
        raise ApiError("'district' is required")
    if not known_district(value):
        raise ApiError(f"Unknown Maharashtra district: {str(value)[:40]}", 404)
    return value


def optional_district(value) -> str | None:
    if value in (None, ""):
        return None
    return require_district(value)


def require_block(district: str, value) -> str:
    if not value:
        raise ApiError("'block' (taluka) is required")
    if not known_block(district, value):
        raise ApiError(f"Unknown taluka '{value}' in district '{district}'", 404)
    return value


def scope_args() -> dict:
    a = request.args
    return {"district": optional_district(a.get("district")), "block": a.get("block") or None}
