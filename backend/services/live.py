"""Optional live NASA upstream requests.

The demo is offline-first. These calls have short timeouts and always fall back
to prepared cache data, so a missing key, a slow network or a NASA outage never
blocks the app.
"""
from __future__ import annotations

import asyncio
import csv
import io
import os
from datetime import date as date_cls, datetime, timedelta, timezone
from typing import Any

import httpx

from .cache import upstream_cache

POWER_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"
FIRMS_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
TIMEOUT = 3.2


async def power_series(lat: float, lon: float) -> dict[str, Any] | None:
    """Fetch a real monthly T2M series for one point, or None on any failure."""
    key = f"power:{lat:.2f}:{lon:.2f}"
    hit = upstream_cache.get(key)
    if hit is not None:
        return hit
    params = {
        "parameters": "T2M",
        "community": "RE",
        "longitude": f"{lon:.2f}",
        "latitude": f"{lat:.2f}",
        "start": "2016",
        "end": str(datetime.now(timezone.utc).year - 1),
        "format": "JSON",
    }
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
            response = await client.get(POWER_URL, params=params)
            response.raise_for_status()
            raw = response.json()["properties"]["parameter"]["T2M"]
        points = {
            str(k): float(v)
            for k, v in raw.items()
            if len(str(k)) == 6 and str(k).isdigit() and 1 <= int(str(k)[4:6]) <= 12
            and isinstance(v, (int, float)) and float(v) > -900
        }
        if not points:
            return None
        months = sorted(points)
        dates = [f"{m[:4]}-{m[4:6]}-01" for m in months]
        values = [round(points[m], 2) for m in months]
        baseline: dict[str, list[float]] = {}
        for date, value in zip(dates, values):
            if int(date[:4]) >= 2024:
                continue
            baseline.setdefault(date[5:7], []).append(value)
        means = {month: sum(v) / len(v) for month, v in baseline.items()}
        anomaly = [
            round(value - means.get(date[5:7], value), 3) for date, value in zip(dates, values)
        ]
        nums = [v for v in values if v is not None]
        lo, hi = min(nums), max(nums)
        payload = {
            "layer": "temperature",
            "dates": dates,
            "values": values,
            "normalized": [round((v - lo) / (hi - lo), 4) if hi > lo else 0.5 for v in values],
            "anomaly": anomaly,
            "unit": "°C",
            "source": "NASA POWER / MERRA-2 T2M monthly · live upstream",
            "cached": False,
            "upstream": "NASA POWER",
        }
        upstream_cache.set(key, payload)
        return payload
    except Exception:
        return None


def _firms_key() -> str | None:
    key = os.getenv("FIRMS_MAP_KEY", "").strip()
    return key or None


def firms_window_available(day: str) -> bool:
    try:
        target = date_cls.fromisoformat(day)
    except ValueError:
        return False
    today = date_cls.today()
    return timedelta(0) <= today - target <= timedelta(days=5)


async def firms_hotspots(day: str, lat: float, lon: float) -> list[dict[str, Any]] | None:
    """Live thermal anomalies around a probe, when a FIRMS key and recent date exist."""
    key = _firms_key()
    if not key or not firms_window_available(day):
        return None
    cache_key = f"firms:{day}:{lat:.0f}:{lon:.0f}"
    hit = upstream_cache.get(cache_key)
    if hit is not None:
        return hit
    source = os.getenv("FIRMS_SOURCE", "VIIRS_SNPP_NRT")
    delta = 2.5
    west, east = max(-180.0, lon - delta), min(180.0, lon + delta)
    south, north = max(-90.0, lat - delta), min(90.0, lat + delta)
    bbox = f"{west},{south},{east},{north}"
    url = f"{FIRMS_URL}/{key}/{source}/{bbox}/1/{day}"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
        rows = list(csv.DictReader(io.StringIO(response.text)))
        points = []
        for row in rows[:1200]:
            try:
                plat, plon = float(row["latitude"]), float(row["longitude"])
                frp = float(row.get("frp") or row.get("bright_ti4") or 0)
                confidence = row.get("confidence", "")
                points.append(
                    {
                        "lat": round(plat, 2),
                        "lon": round(plon, 2),
                        "count": 1,
                        "intensity": round(min(1.0, max(0.05, frp / 80)), 3),
                        "confidence": confidence,
                    }
                )
            except (KeyError, ValueError):
                continue
        upstream_cache.set(cache_key, points)
        return points
    except Exception:
        return None


async def gather_optional(awaitables: list) -> None:
    """Await optional upstream work without letting one failure cancel the rest."""
    await asyncio.gather(*awaitables, return_exceptions=True)
