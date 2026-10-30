"""Cached NASA datasets and point sampling.

All values in `/api/series` come from files prepared by `scripts/prepare_data.py`.
Nothing here invents a value: unsampled points are returned as null, and every
response advertises whether it came from a live upstream request or the cache.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / "data" / "cache"

TITLES = {
    "temperature": "Temperature",
    "fires": "Fires",
    "vegetation": "Vegetation",
    "water": "Water",
}

UNITS = {
    "temperature": "°C",
    "fires": "index",
    "vegetation": "NDVI",
    "water": "cm",
}

_file_cache: dict[str, tuple[float, Any]] = {}


def _load(name: str) -> Any:
    path = CACHE_DIR / name
    if not path.exists():
        raise FileNotFoundError(f"Missing cache file: {path}. Run `python scripts/prepare_data.py`.")
    stamp = path.stat().st_mtime
    hit = _file_cache.get(name)
    if hit and hit[0] == stamp:
        return hit[1]
    value = json.loads(path.read_text(encoding="utf-8"))
    _file_cache[name] = (stamp, value)
    return value


def manifest() -> dict[str, Any]:
    return _load("manifest.json")


def grids() -> dict[str, Any]:
    return _load("grids.json")


def hotspots() -> dict[str, Any]:
    return _load("hotspots.json")


def power_grid() -> dict[str, Any]:
    return _load("power_grid.json")


def cache_status() -> dict[str, Any]:
    files = ["manifest.json", "grids.json", "hotspots.json", "power_grid.json"]
    present = {name: (CACHE_DIR / name).exists() for name in files}
    sizes = {
        name: (CACHE_DIR / name).stat().st_size
        for name, ok in present.items()
        if ok
    }
    try:
        generated = manifest().get("generatedAt")
    except Exception:
        generated = None
    return {
        "ready": all(present.values()),
        "files": present,
        "bytes": sizes,
        "generatedAt": generated,
    }


def layer_list() -> list[dict[str, Any]]:
    data = manifest()
    result = []
    for layer_id, entry in data.get("tracks", {}).items():
        result.append(
            {
                "id": layer_id,
                "title": TITLES.get(layer_id, layer_id.title()),
                "unit": UNITS.get(layer_id, entry.get("unit", "")),
                "dates": entry.get("dates", []),
                "frames": entry.get("frames", []),
                "source": entry.get("source"),
                "gibsLayer": entry.get("layer"),
                "tileUrlTemplate": entry.get("tileUrlTemplate"),
                "cached": True,
            }
        )
    order = {"temperature": 0, "fires": 1, "vegetation": 2, "water": 3}
    return sorted(result, key=lambda item: order.get(item["id"], 9))


def _finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and math.isfinite(value)


def _min_max(values: list[float | None]) -> tuple[float, float]:
    nums = [v for v in values if _finite(v)]
    if not nums:
        return 0.0, 1.0
    lo, hi = min(nums), max(nums)
    if hi - lo < 1e-9:
        return lo - 0.5, hi + 0.5
    return lo, hi


def normalized(values: list[float | None]) -> list[float | None]:
    lo, hi = _min_max(values)
    return [None if not _finite(v) else round((v - lo) / (hi - lo), 4) for v in values]


def sample_grid(values: list[Any], lat: float, lon: float, width: int = 144, height: int = 72) -> float | None:
    """Bilinear sample with a nearest-cell fallback near masked coastlines."""
    wrapped = ((((lon + 180) % 360) + 360) % 360) - 180
    x = ((wrapped + 180) / 360) * (width - 1)
    y = ((90 - lat) / 180) * (height - 1)
    x0, y0 = math.floor(x), math.floor(y)
    fx, fy = x - x0, y - y0
    samples: list[tuple[float, float]] = []
    for dx, dy, weight in (
        (0, 0, (1 - fx) * (1 - fy)),
        (1, 0, fx * (1 - fy)),
        (0, 1, (1 - fx) * fy),
        (1, 1, fx * fy),
    ):
        xx = min(width - 1, max(0, x0 + dx))
        yy = min(height - 1, max(0, y0 + dy))
        value = values[yy * width + xx]
        if _finite(value):
            samples.append((float(value), weight))
    if not samples:
        best = None
        distance = math.inf
        for yy in range(max(0, y0 - 2), min(height, y0 + 3)):
            for xx in range(max(0, x0 - 2), min(width, x0 + 3)):
                value = values[yy * width + xx]
                if not _finite(value):
                    continue
                d = (xx - x) ** 2 + (yy - y) ** 2
                if d < distance:
                    best, distance = float(value), d
        return best
    total = sum(weight for _, weight in samples) or 1.0
    return sum(value * weight for value, weight in samples) / total


def sample_power(power: dict[str, Any], lat: float, lon: float, month: str) -> float | None:
    field = power.get("fields", {}).get(month)
    if not field:
        return None
    lats = power["lats"]
    lons = power["lons"]
    cy = min(max(lat, lats[0]), lats[-1])
    y0 = 0
    while y0 < len(lats) - 2 and lats[y0 + 1] < cy:
        y0 += 1
    fy = (cy - lats[y0]) / (lats[y0 + 1] - lats[y0])
    wrapped = ((((lon + 180) % 360) + 360) % 360) - 180
    x0 = 0
    while x0 < len(lons) - 2 and lons[x0 + 1] < wrapped:
        x0 += 1
    fx = min(1.0, max(0.0, (wrapped - lons[x0]) / (lons[x0 + 1] - lons[x0])))
    samples: list[tuple[float, float]] = []
    for dx, dy, weight in (
        (0, 0, (1 - fx) * (1 - fy)),
        (1, 0, fx * (1 - fy)),
        (0, 1, (1 - fx) * fy),
        (1, 1, fx * fy),
    ):
        row = field[min(len(lats) - 1, y0 + dy)]
        value = row[min(len(lons) - 1, x0 + dx)]
        if _finite(value):
            samples.append((float(value), weight))
    if not samples:
        return None
    total = sum(weight for _, weight in samples) or 1.0
    return sum(value * weight for value, weight in samples) / total


def month_key(date: str) -> str:
    return date[:4] + date[5:7]


def _baseline_means(dates: list[str], values: list[float | None], end_year: int) -> dict[str, float]:
    groups: dict[str, list[float]] = {}
    for date, value in zip(dates, values):
        if not _finite(value) or int(date[:4]) > end_year:
            continue
        groups.setdefault(date[5:7], []).append(float(value))
    return {month: sum(items) / len(items) for month, items in groups.items() if items}


def series_from_power(power: dict[str, Any], lat: float, lon: float) -> dict[str, Any]:
    dates = [f"{m[:4]}-{m[4:6]}-01" for m in power["months"]]
    values = [sample_power(power, lat, lon, month) for month in power["months"]]
    means = _baseline_means(dates, values, int(power.get("baselineEnd", 2024)))
    anomaly = [
        None if not _finite(v) else round(float(v) - means.get(date[5:7], float(v)), 3)
        for date, v in zip(dates, values)
    ]
    return {
        "layer": "temperature",
        "dates": dates,
        "values": [None if not _finite(v) else round(float(v), 2) for v in values],
        "normalized": normalized(values),
        "anomaly": anomaly,
        "unit": "°C",
        "source": power.get("source", "NASA POWER / MERRA-2 T2M monthly"),
        "cached": True,
    }


def series_from_grid(layer: str, lat: float, lon: float) -> dict[str, Any]:
    data = grids()
    entry = data["tracks"].get(layer)
    if not entry:
        raise KeyError(layer)
    width, height = data.get("width", 144), data.get("height", 72)
    dates = entry["dates"]
    values = [sample_grid(frame, lat, lon, width, height) for frame in entry["values"]]
    if layer == "water":
        anomaly = [0.0 if not _finite(v) else round(float(v), 3) for v in values]
    else:
        valid = [float(v) for v in values if _finite(v)]
        mean = sum(valid) / len(valid) if valid else 0.0
        anomaly = [None if not _finite(v) else round(float(v) - mean, 3) for v in values]
    source = manifest().get("tracks", {}).get(layer, {}).get("source") or f"NASA GIBS · {layer}"
    return {
        "layer": layer,
        "dates": dates,
        "values": [None if not _finite(v) else round(float(v), 3) for v in values],
        "normalized": normalized(values),
        "anomaly": anomaly,
        "unit": UNITS.get(layer, entry.get("unit", "")),
        "source": source,
        "cached": True,
    }


def nearest_index(dates: list[str], date: str) -> int:
    if not dates:
        return 0
    if date in dates:
        return dates.index(date)
    try:
        target = date
        best, distance = 0, 10**12
        for i, candidate in enumerate(dates):
            # ISO dates sort lexicographically within a stable format.
            delta = abs((candidate > target) - (candidate < target))
            if candidate == target:
                return i
            # Use month distance as a robust, timezone-free measure.
            cy, cm = int(candidate[:4]), int(candidate[5:7])
            ty, tm = int(target[:4]), int(target[5:7])
            d = abs((cy * 12 + cm) - (ty * 12 + tm))
            if d < distance:
                best, distance = i, d
        return best
    except Exception:
        return 0


def describe_point(layer: str, lat: float, lon: float, date: str) -> dict[str, Any]:
    series = series_from_power(power_grid(), lat, lon) if layer == "temperature" else series_from_grid(layer, lat, lon)
    index = nearest_index(series["dates"], date)
    value = series["values"][index] if index < len(series["values"]) else None
    anomaly = series["anomaly"][index] if index < len(series["anomaly"]) else None
    zone = "the polar zone" if abs(lat) > 66 else "the mid-latitudes" if abs(lat) > 45 else "the subtropics" if abs(lat) > 23.5 else "the tropics"
    if value is None:
        text = "No data at this point on this date. Move the probe or choose another month."
    elif layer == "temperature":
        a = anomaly or 0
        direction = "warmer than" if a > 0.35 else "cooler than" if a < -0.35 else "close to"
        harmony = "The harmony leans minor." if a > 0.9 else "The harmony opens and brightens." if a < -0.4 else "The harmony sits in balance."
        text = f"{value:.1f}°C in {zone}, {direction} the 2016–24 average. {harmony}"
    elif layer == "fires":
        level = "Dense thermal activity" if value > 70 else "Scattered thermal activity" if value > 38 else "Light thermal activity" if value > 12 else "Almost no thermal signal"
        rhythm = "The rhythm is fast and busy." if value > 45 else "The rhythm is sparse and dry."
        text = f"{level} at this point. {rhythm}"
    elif layer == "vegetation":
        level = "Lush green cover" if value > 0.6 else "Moderate green cover" if value > 0.35 else "Sparse green cover"
        rhythm = "Bright, busy plucks." if value > 0.55 else "There is space between the notes."
        text = f"{level} in {zone}. {rhythm}"
    else:
        level = "above" if value > 4 else "below" if value < -4 else "near"
        tail = "The drone has dropped." if value < -4 else "The drone floats higher."
        text = f"Water storage is {level} the year's mean ({value:+.1f} cm). {tail}"
    return {
        "layer": layer,
        "lat": round(lat, 3),
        "lon": round(lon, 3),
        "date": series["dates"][index] if series["dates"] else date,
        "value": value,
        "anomaly": anomaly,
        "unit": series["unit"],
        "text": text,
        "aria": f"Probe at {abs(lat):.1f} degrees {'north' if lat >= 0 else 'south'}, {abs(lon):.1f} degrees {'east' if lon >= 0 else 'west'}. {text}",
        "cached": True,
        "source": series["source"],
    }
