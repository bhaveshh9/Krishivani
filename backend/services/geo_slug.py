"""ID scheme for real Panchayat points: <district-slug>__<taluka-slug>__<n>.
Globally unique and reversible, so a bare panchayat id is enough to look up its
district + taluka without the client having to pass them separately."""
import re


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def make_id(district: str, taluka: str, n: int) -> str:
    return f"{slugify(district)}__{slugify(taluka)}__{n}"


def parse_id(pid: str):
    """-> (district_slug, taluka_slug, n) or None if malformed."""
    parts = pid.split("__")
    if len(parts) != 3:
        return None
    try:
        return parts[0], parts[1], int(parts[2])
    except ValueError:
        return None
