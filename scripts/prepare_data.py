"""
Earth Jukebox data preparation.

Downloads real NASA GIBS frames and NASA POWER monthly temperatures, then
writes deterministic offline caches for the demo:

  frontend/public/frames/<track>/<date>.webp   stylized GIBS frames
  frontend/public/frames/base.webp             Blue Marble relief basemap
  backend/data/cache/manifest.json             frame + source metadata
  backend/data/cache/grids.json                palette-derived global fields
  backend/data/cache/hotspots.json             aggregated thermal anomalies
  backend/data/cache/power_grid.json           NASA POWER monthly T2M sample grid

The stylization is a presentation layer. Pixel values are ranked from the
official GIBS colormap; no pixel is invented. Temperature time series are real
NASA POWER values at probe points, interpolated from the cached sample grid.
Run from the repository root:  python scripts/prepare_data.py
"""
from __future__ import annotations

import asyncio
import io
import json
import math
import os
import re
import sys
from datetime import datetime
from pathlib import Path

import httpx
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
FRAMES = ROOT / "frontend" / "public" / "frames"
CACHE = ROOT / "backend" / "data" / "cache"
ORIGINALS = ROOT / ".cache" / "originals"

GIBS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
POWER = "https://power.larc.nasa.gov/api/temporal/monthly/point"
FRAME_W, FRAME_H = 1600, 800
GRID_W, GRID_H = 144, 72

TRACKS = {
    "temperature": {
        "title": "Temperature",
        "layer": "MODIS_Aqua_L3_Land_Surface_Temp_Monthly_Day",
        "dates": [f"2025-{m:02d}-01" for m in range(1, 13)],
        "source": "MODIS/Aqua Land Surface Temperature (monthly, day) · NASA GIBS",
        "unit": "°C",
    },
    "fires": {
        "title": "Fires",
        "layer": "MODIS_Terra_Thermal_Anomalies_Day",
        "dates": [f"2025-{m:02d}-15" for m in range(1, 13)],
        "source": "MODIS/Terra Thermal Anomalies & Fire (daily) · NASA GIBS",
        "unit": "fires",
    },
    "vegetation": {
        "title": "Vegetation",
        "layer": "MODIS_Terra_L3_NDVI_Monthly",
        "dates": [f"2024-{m:02d}-01" for m in range(4, 13)] + [f"2025-{m:02d}-01" for m in range(1, 4)],
        "source": "MODIS/Terra NDVI (monthly) · NASA GIBS",
        "unit": "NDVI",
    },
    "water": {
        "title": "Water",
        "layer": "GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI",
        "dates": [f"2021-{m:02d}-01" for m in range(8, 13)] + [f"2022-{m:02d}-01" for m in range(1, 8)],
        "source": "GRACE Tellus liquid water equivalent thickness · NASA GIBS",
        "unit": "cm",
    },
}

# Editorial duotone ramps. Positions are normalised data ranks.
RAMPS = {
    "temperature": [(0.0, "#27384b"), (0.26, "#3f75bb"), (0.53, "#f9eed8"), (0.78, "#d6925d"), (1.0, "#b94f38")],
    "fires": [(0.0, "#f9eed8"), (0.55, "#e0a36f"), (1.0, "#b94f38")],
    "vegetation": [(0.0, "#8b5b42"), (0.45, "#739a69"), (0.78, "#b7c498"), (1.0, "#f9eed8")],
    "water": [(0.0, "#b45f43"), (0.5, "#d9cbb1"), (1.0, "#3f75bb")],
}


def ensure_dirs() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    ORIGINALS.mkdir(parents=True, exist_ok=True)
    for track in TRACKS:
        (FRAMES / track).mkdir(parents=True, exist_ok=True)


async def get_bytes(client: httpx.AsyncClient, url: str, retries: int = 3) -> bytes:
    last = None
    for attempt in range(retries):
        try:
            r = await client.get(url, timeout=90)
            if r.status_code == 200 and len(r.content) > 200:
                return r.content
            last = RuntimeError(f"HTTP {r.status_code}: {r.text[:160]}")
        except Exception as exc:  # network hiccup
            last = exc
        await asyncio.sleep(1.2 * (attempt + 1))
    raise RuntimeError(f"Download failed: {url}\n{last}")


def wms_url(layer: str, date: str | None, width: int = FRAME_W, height: int = FRAME_H) -> str:
    time = f"&TIME={date}" if date else ""
    return (
        f"{GIBS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS={layer}&STYLES="
        f"&FORMAT=image/png&TRANSPARENT=TRUE&CRS=EPSG:4326"
        f"&BBOX=-90,-180,90,180&WIDTH={width}&HEIGHT={height}{time}"
    )


async def download_frames() -> dict:
    client = httpx.AsyncClient(follow_redirects=True, headers={"User-Agent": "EarthJukebox/1.0"})
    manifest = {"generatedAt": datetime.utcnow().isoformat() + "Z", "tracks": {}}
    try:
        base_path = FRAMES / "base.webp"
        if not base_path.exists():
            print("· basemap")
            data = await get_bytes(
                client,
                f"{GIBS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=BlueMarble_ShadedRelief"
                "&STYLES=&FORMAT=image/jpeg&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH=2048&HEIGHT=1024",
            )
            Image.open(io.BytesIO(data)).convert("RGB").save(base_path, "WEBP", quality=84, method=6)

        for track_id, cfg in TRACKS.items():
            dates = cfg["dates"]
            entry = {
                "dates": dates,
                "frames": [],
                "source": cfg["source"],
                "layer": cfg["layer"],
                "tileUrlTemplate": wms_url(cfg["layer"], "{date}", 1024, 512),
            }
            for i, date in enumerate(dates):
                out = FRAMES / track_id / f"{date}.webp"
                original = ORIGINALS / track_id / f"{date}.png"
                original.parent.mkdir(parents=True, exist_ok=True)
                if not original.exists():
                    data = await get_bytes(client, wms_url(cfg["layer"], date))
                    original.write_bytes(data)
                print(f"· {track_id} {date} ({i + 1}/{len(dates)})")
                img = Image.open(original).convert("RGBA")
                img = img.resize((FRAME_W, FRAME_H), Image.Resampling.LANCZOS)
                stylize(img, track_id).save(out, "WEBP", quality=86, method=6)
                entry["frames"].append(f"/frames/{track_id}/{date}.webp")
            manifest["tracks"][track_id] = entry
    finally:
        await client.aclose()
    return manifest


def hex_rgb(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def ramp_pixels(values: np.ndarray, ramp: list[tuple[float, str]]) -> np.ndarray:
    stops = np.array([p for p, _ in ramp], dtype=np.float32)
    colors = np.stack([hex_rgb(c) for _, c in ramp])
    out = np.empty(values.shape + (3,), dtype=np.float32)
    for c in range(3):
        out[..., c] = np.interp(values, stops, colors[:, c])
    return out


def hsv_arrays(rgba: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Vectorised HSV. Hue in degrees [0,360), sat/value in [0,1]."""
    rgb = rgba[..., :3].astype(np.float32) / 255.0
    mx = rgb.max(axis=-1)
    mn = rgb.min(axis=-1)
    diff = mx - mn + 1e-6
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(mx)
    mask = mx == r
    h[mask] = ((g[mask] - b[mask]) / diff[mask]) % 6
    mask = mx == g
    h[mask] = (b[mask] - r[mask]) / diff[mask] + 2
    mask = mx == b
    h[mask] = (r[mask] - g[mask]) / diff[mask] + 4
    h *= 60.0
    sat = np.where(mx > 0, diff / (mx + 1e-6), 0)
    return h, sat, mx


def rank_values(track: str, rgba: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Recover a normalised 0–1 data rank from an official GIBS colour."""
    h, s, v = hsv_arrays(rgba)
    a = rgba[..., 3].astype(np.float32) / 255.0
    if track == "temperature":
        # cyan/purple = cold, green = mild, yellow = warm, orange/red = hot
        rank = np.select(
            [
                h > 300,
                h >= 190,
                h >= 100,
                h >= 60,
                h >= 30,
                h >= 0,
            ],
            [
                1.0,
                np.interp(h, [190, 240, 300], [0.15, 0.03, 0.0]),
                np.interp(h, [100, 190], [0.38, 0.16]),
                np.interp(h, [60, 100], [0.64, 0.38]),
                np.interp(h, [30, 60], [0.82, 0.64]),
                np.interp(h, [0, 30], [1.0, 0.82]),
            ],
            default=0.5,
        )
        # desaturated pale pixels are often cloud/ice → treat as cold
        rank = np.where(s < 0.12, 0.1, rank)
    elif track == "vegetation":
        rank = np.clip((h - 18) / 112.0, 0, 1)
        rank = np.where(s < 0.08, 0.5, rank)
    elif track == "water":
        rank = np.select(
            [h < 20, h < 45, h < 85, h < 150, h < 200, h >= 200],
            [
                np.interp(h, [0, 20], [0.0, 0.08]),
                np.interp(h, [20, 45], [0.08, 0.18]),
                np.interp(h, [45, 85], [0.18, 0.26]),
                np.interp(h, [85, 150], [0.26, 0.48]),
                np.interp(h, [150, 200], [0.48, 0.72]),
                np.interp(h, [200, 250], [0.72, 1.0]),
            ],
            default=0.5,
        )
    else:  # fire: alpha carries confidence/intensity
        rank = np.clip(v * 0.35 + a * 0.65, 0, 1)
    valid = a > 0.035
    return rank.astype(np.float32), valid


def stylize(img: Image.Image, track: str) -> Image.Image:
    rgba = np.array(img, dtype=np.uint8)
    h, s, v = hsv_arrays(rgba)
    rank, valid = rank_values(track, rgba)
    a = rgba[..., 3].astype(np.float32) / 255.0
    rgb = ramp_pixels(rank, RAMPS[track])

    if track == "fires":
        # Alpha is sparse; add a restrained two-pixel halo so heat reads at a glance.
        alpha_img = Image.fromarray((np.clip(a * 255, 0, 255)).astype(np.uint8), "L")
        halo = np.asarray(alpha_img.filter(ImageFilter.GaussianBlur(2.1)), dtype=np.float32) / 255.0
        out_a = np.clip(a * 0.94 + halo * 0.48, 0, 1)
        rgb = rgb * (1 - halo[..., None] * 0.1) + hex_rgb("#f9eed8") * (halo[..., None] * 0.1)
    else:
        # Keep data legible over the relief: stronger where the signal is stronger.
        out_a = np.clip(a * (0.50 + 0.42 * rank), 0, 1)
        # Slight cream wash on the dimmest pixels prevents muddy edges.
        dim = np.clip(1 - rank * 2.4, 0, 1)[..., None] * a[..., None] * 0.10
        rgb = rgb * (1 - dim) + hex_rgb("#f9eed8") * dim

    rgba[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    rgba[..., 3] = (np.clip(out_a, 0, 1) * 255).astype(np.uint8)
    out = Image.fromarray(rgba, "RGBA")
    return out


def resize_float(arr: np.ndarray, w: int = GRID_W, h: int = GRID_H) -> np.ndarray:
    return np.asarray(Image.fromarray(arr.astype(np.float32), "F").resize((w, h), Image.Resampling.BOX), dtype=np.float32)


def build_grids_and_hotspots() -> tuple[dict, dict]:
    grids = {"width": GRID_W, "height": GRID_H, "tracks": {}}
    hotspots = {}
    for track_id, cfg in TRACKS.items():
        track_grids = []
        track_hot = []
        for date in cfg["dates"]:
            original = ORIGINALS / track_id / f"{date}.png"
            img = Image.open(original).convert("RGBA").resize((FRAME_W, FRAME_H), Image.Resampling.LANCZOS)
            rgba = np.asarray(img, dtype=np.uint8)
            rank, valid = rank_values(track_id, rgba)
            if track_id == "temperature":
                rank = np.clip((rank - 0.03) / 0.94, 0, 1)
            elif track_id == "vegetation":
                # Palette-derived NDVI proxy, calibrated to a plausible 0–0.85 range.
                rank = rank * 0.85
            elif track_id == "water":
                # Palette-derived GRACE anomaly, roughly −18…+24 cm.
                rank = (rank - 0.5) * 42.0
            elif track_id == "fires":
                # A 0–100 heat index; the visual rank is 0–1.
                rank = np.clip(rank ** 1.2, 0, 1) * 100.0

            weight = valid.astype(np.float32)
            vals = rank * weight
            num = resize_float(vals)
            den = resize_float(weight)
            grid = np.divide(num, den, out=np.zeros_like(num), where=den > 0.005)
            track_grids.append([None if den[y, x] < 0.005 else round(float(grid[y, x]), 4) for y in range(GRID_H) for x in range(GRID_W)])

            if track_id == "fires":
                alpha = rgba[..., 3].astype(np.float32) / 255.0
                fire_mask = alpha > 0.12
                cell_h, cell_w = FRAME_H / GRID_H, FRAME_W / GRID_W
                points = []
                for gy in range(GRID_H):
                    for gx in range(GRID_W):
                        sub = fire_mask[int(gy * cell_h) : int((gy + 1) * cell_h), int(gx * cell_w) : int((gx + 1) * cell_w)]
                        count = int(sub.sum())
                        if count < 3:
                            continue
                        lat = 90 - (gy + 0.5) * (180 / GRID_H)
                        lon = -180 + (gx + 0.5) * (360 / GRID_W)
                        points.append({"lat": round(lat, 2), "lon": round(lon, 2), "count": count, "intensity": round(min(1.0, count / 36), 3)})
                points.sort(key=lambda p: (-p["count"], -p["intensity"]))
                track_hot.append(points[:2000])
        grids["tracks"][track_id] = {
            "dates": cfg["dates"],
            "values": track_grids,
            "unit": cfg["unit"],
        }
        if track_hot:
            hotspots[track_id] = {"dates": cfg["dates"], "frames": track_hot}
        print(f"  grid {track_id}: {len(track_grids)} frames")
    return grids, hotspots


async def fetch_power_grid() -> dict:
    lats = [-70.0, -50.0, -30.0, -10.0, 10.0, 30.0, 50.0, 70.0]
    lons = [-160.0, -120.0, -80.0, -40.0, 0.0, 40.0, 80.0, 120.0, 160.0]
    sem = asyncio.Semaphore(5)
    client = httpx.AsyncClient(follow_redirects=True, headers={"User-Agent": "EarthJukebox/1.0"})

    async def one(lat: float, lon: float) -> tuple[float, float, dict[str, float]]:
        async with sem:
            params = {
                "parameters": "T2M",
                "community": "RE",
                "longitude": lon,
                "latitude": lat,
                "start": "2016",
                "end": "2025",
                "format": "JSON",
            }
            for attempt in range(3):
                try:
                    r = await client.get(POWER, params=params, timeout=40)
                    r.raise_for_status()
                    data = r.json()["properties"]["parameter"]["T2M"]
                    values = {
                        k: float(v)
                        for k, v in data.items()
                        if re.fullmatch(r"\d{6}", k) and float(v) > -900
                    }
                    return lat, lon, values
                except Exception as exc:
                    if attempt == 2:
                        print(f"  ! POWER {lat},{lon}: {exc}")
                        return lat, lon, {}
                    await asyncio.sleep(1 + attempt)

    points = []
    tasks = [one(lat, lon) for lat in lats for lon in lons]
    for i, coro in enumerate(asyncio.as_completed(tasks), 1):
        points.append(await coro)
        if i % 8 == 0:
            print(f"  POWER points {i}/{len(tasks)}")
    await client.aclose()
    # Monthly climatology fields used for offline interpolation.
    months = [f"{y}{m:02d}" for y in range(2016, 2026) for m in range(1, 13)]
    fields = {}
    for key in months:
        rows = []
        for lat in lats:
            row = []
            for lon in lons:
                match = next((p for p in points if p[0] == lat and p[1] == lon), None)
                row.append(None if not match or key not in match[2] else round(match[2][key], 2))
            rows.append(row)
        fields[key] = rows
    return {
        "lats": lats,
        "lons": lons,
        "months": months,
        "fields": fields,
        "baselineStart": 2016,
        "baselineEnd": 2024,
        "source": "NASA POWER / MERRA-2 T2M monthly, community RE",
    }


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ensure_dirs()
    print("Earth Jukebox · preparing NASA cache")
    manifest = asyncio.run(download_frames())
    (CACHE / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    grids, hotspots = build_grids_and_hotspots()
    (CACHE / "grids.json").write_text(json.dumps(grids, separators=(",", ":")), encoding="utf-8")
    (CACHE / "hotspots.json").write_text(json.dumps(hotspots, separators=(",", ":")), encoding="utf-8")
    power = asyncio.run(fetch_power_grid())
    (CACHE / "power_grid.json").write_text(json.dumps(power, separators=(",", ":")), encoding="utf-8")
    print("✓ cache ready")
    print(f"  frames:   {sum(len(t['frames']) for t in manifest['tracks'].values())}")
    print(f"  grids:    {(CACHE / 'grids.json').stat().st_size / 1024:.0f} KB")
    print(f"  POWER:    {(CACHE / 'power_grid.json').stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
