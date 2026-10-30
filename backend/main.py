"""Earth Jukebox API.

Run from `backend/`:
    uvicorn main:app --reload --port 8000

Every endpoint degrades to the prepared NASA cache in `data/cache/`.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT.parent / ".env")
load_dotenv(ROOT / ".env")

from services import datasets, live  # noqa: E402
from services.cache import upstream_cache  # noqa: E402

APP_VERSION = "1.0.0"
LAYERS = ("temperature", "fires", "vegetation", "water")

app = FastAPI(
    title="Earth Jukebox API",
    description="NASA Earth observation series, thermal hotspots and plain-language descriptions.",
    version=APP_VERSION,
)

origins = [item.strip() for item in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173").split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.exception_handler(FileNotFoundError)
async def missing_cache_handler(_request: Request, exc: FileNotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={
            "error": "cache_missing",
            "detail": str(exc),
            "hint": "Run `python scripts/prepare_data.py` from the repository root.",
        },
    )


def _require_layer(layer: str) -> str:
    if layer not in LAYERS:
        raise HTTPException(status_code=404, detail=f"Unknown layer '{layer}'. Choose one of: {', '.join(LAYERS)}.")
    return layer


@app.get("/api/health")
async def health() -> dict:
    status = datasets.cache_status()
    return {
        "status": "ok" if status["ready"] else "degraded",
        "service": "earth-jukebox",
        "version": APP_VERSION,
        "time": datetime.now(timezone.utc).isoformat(),
        "cache": status,
        "live": {
            "power": os.getenv("EARTH_JUKEBOX_LIVE", "1") != "0",
            "firms": bool(os.getenv("FIRMS_MAP_KEY", "").strip()),
        },
        "layers": list(LAYERS),
    }


@app.get("/api/layers")
async def layers() -> dict:
    data = datasets.layer_list()
    return {
        "layers": data,
        "count": len(data),
        "cached": True,
        "generatedAt": datasets.cache_status().get("generatedAt"),
    }


@app.get("/api/series")
async def series(
    layer: str = Query(..., description="temperature | fires | vegetation | water"),
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    start: str | None = Query(None, description="ISO date; reserved for future windows"),
    end: str | None = Query(None, description="ISO date; reserved for future windows"),
    cached: bool = Query(False, description="Set true to skip upstream and serve cache immediately"),
) -> dict:
    _require_layer(layer)
    key = f"series:{layer}:{lat:.2f}:{lon:.2f}:{'cache' if cached else 'live'}"
    hit = upstream_cache.get(key)
    if hit is not None:
        return {**hit, "cacheHit": True}

    payload = None
    if layer == "temperature" and cached is False and os.getenv("EARTH_JUKEBOX_LIVE", "1") != "0":
        payload = await live.power_series(lat, lon)
    if payload is None and layer == "temperature":
        # The default path stays fully offline; live POWER is opt-in with cached=false.
        payload = datasets.series_from_power(datasets.power_grid(), lat, lon)
    elif payload is None:
        payload = datasets.series_from_grid(layer, lat, lon)

    if start or end:
        dates = payload["dates"]
        mask = [
            i
            for i, date in enumerate(dates)
            if (not start or date >= start) and (not end or date <= end)
        ]
        if mask:
            for field in ("dates", "values", "normalized", "anomaly"):
                payload[field] = [payload[field][i] for i in mask]

    payload = {**payload, "cacheHit": False, "generatedAt": datetime.now(timezone.utc).isoformat()}
    upstream_cache.set(key, payload)
    return payload


@app.get("/api/hotspots")
async def hotspots(
    layer: str = Query("fires"),
    date: str = Query(..., description="ISO date, e.g. 2025-10-15"),
    lat: float | None = Query(None, ge=-90, le=90),
    lon: float | None = Query(None, ge=-180, le=180),
) -> dict:
    _require_layer(layer)
    if layer != "fires":
        return {"layer": layer, "date": date, "points": [], "count": 0, "cached": True}

    cached_data = datasets.hotspots()
    entry = cached_data.get("fires") or {"dates": [], "frames": []}
    dates = entry.get("dates", [])
    index = datasets.nearest_index(dates, date)
    points = entry.get("frames", [])[index] if entry.get("frames") else []

    live_points = None
    if lat is not None and lon is not None:
        live_points = await live.firms_hotspots(date, lat, lon)
    if live_points:
        return {
            "layer": "fires",
            "date": date,
            "points": live_points,
            "count": len(live_points),
            "cached": False,
            "upstream": "NASA FIRMS",
        }
    return {
        "layer": "fires",
        "date": dates[index] if dates else date,
        "points": points,
        "count": len(points),
        "cached": True,
        "source": "MODIS/Terra thermal anomalies · cached GIBS aggregate",
    }


@app.get("/api/describe")
async def describe(
    layer: str = Query(...),
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    date: str = Query(...),
) -> dict:
    _require_layer(layer)
    try:
        return datasets.describe_point(layer, lat, lon, date)
    except FileNotFoundError as exc:
        raise exc
    except Exception as exc:  # never let a bad date break the map
        raise HTTPException(status_code=422, detail=f"Could not describe this point: {exc}") from exc


@app.get("/api/cache/clear", include_in_schema=False)
async def clear_cache() -> dict:
    # Read-only public deployment: only allow clearing when explicitly enabled.
    if os.getenv("EARTH_JUKEBOX_ALLOW_CACHE_CLEAR", "0") != "1":
        raise HTTPException(status_code=403, detail="Cache clearing is disabled.")
    upstream_cache.clear()
    return {"status": "cleared"}
