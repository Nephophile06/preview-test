import { frameForDate, trackForId } from './tracks'

const dataCache = new Map()

async function json(path) {
  if (!dataCache.has(path)) {
    dataCache.set(
      path,
      fetch(path).then((res) => {
        if (!res.ok) throw new Error(`${path}: ${res.status}`)
        return res.json()
      }),
    )
  }
  return dataCache.get(path)
}

function minMax(values) {
  const nums = values.filter((v) => Number.isFinite(v))
  if (!nums.length) return [0, 1]
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  return max - min < 1e-9 ? [min - 0.5, max + 0.5] : [min, max]
}

function sampleGrid(values, lat, lon, width = 144, height = 72) {
  if (!values) return null
  const wrappedLon = ((((lon + 180) % 360) + 360) % 360) - 180
  const x = ((wrappedLon + 180) / 360) * (width - 1)
  const y = ((90 - lat) / 180) * (height - 1)
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const samples = []
  for (const [dx, dy, weight] of [
    [0, 0, (1 - fx) * (1 - fy)],
    [1, 0, fx * (1 - fy)],
    [0, 1, (1 - fx) * fy],
    [1, 1, fx * fy],
  ]) {
    const xx = Math.min(width - 1, Math.max(0, x0 + dx))
    const yy = Math.min(height - 1, Math.max(0, y0 + dy))
    const value = values[yy * width + xx]
    if (value != null && Number.isFinite(value)) samples.push([value, weight])
  }
  if (!samples.length) {
    // A point near a masked coastline still gets the nearest valid cell.
    let nearest = null
    let distance = Infinity
    for (let yy = Math.max(0, y0 - 2); yy <= Math.min(height - 1, y0 + 2); yy += 1) {
      for (let xx = Math.max(0, x0 - 2); xx <= Math.min(width - 1, x0 + 2); xx += 1) {
        const value = values[yy * width + xx]
        if (value == null || !Number.isFinite(value)) continue
        const d = (xx - x) ** 2 + (yy - y) ** 2
        if (d < distance) {
          nearest = value
          distance = d
        }
      }
    }
    return nearest
  }
  const weight = samples.reduce((sum, [, w]) => sum + w, 0) || 1
  return samples.reduce((sum, [v, w]) => sum + v * w, 0) / weight
}

function samplePower(power, lat, lon, monthKey) {
  const field = power?.fields?.[monthKey]
  if (!field) return null
  const lats = power.lats
  const lons = power.lons
  const cy = Math.min(Math.max(lat, lats[0]), lats[lats.length - 1])
  let y0 = 0
  while (y0 < lats.length - 2 && lats[y0 + 1] < cy) y0 += 1
  const fy = (cy - lats[y0]) / (lats[y0 + 1] - lats[y0])
  const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180
  let x0 = 0
  while (x0 < lons.length - 2 && lons[x0 + 1] < wrapped) x0 += 1
  const fx = Math.min(1, Math.max(0, (wrapped - lons[x0]) / (lons[x0 + 1] - lons[x0])))
  const values = []
  for (const [dx, dy, weight] of [
    [0, 0, (1 - fx) * (1 - fy)],
    [1, 0, fx * (1 - fy)],
    [0, 1, (1 - fx) * fy],
    [1, 1, fx * fy],
  ]) {
    const value = field[Math.min(lats.length - 1, y0 + dy)]?.[Math.min(lons.length - 1, x0 + dx)]
    if (value != null && Number.isFinite(value)) values.push([value, weight])
  }
  if (!values.length) return null
  const total = values.reduce((sum, [, w]) => sum + w, 0) || 1
  return values.reduce((sum, [v, w]) => sum + v * w, 0) / total
}

function calendarAnomaly(dates, values) {
  const groups = new Map()
  dates.forEach((date, i) => {
    const month = date.slice(5, 7)
    if (!groups.has(month)) groups.set(month, [])
    if (Number.isFinite(values[i])) groups.get(month).push(values[i])
  })
  const means = new Map([...groups].map(([month, list]) => [month, list.reduce((a, b) => a + b, 0) / list.length]))
  return values.map((value, i) => (Number.isFinite(value) ? value - means.get(dates[i].slice(5, 7)) : 0))
}

export async function buildLocalSeries(trackId, lat, lon) {
  const track = trackForId(trackId)
  if (trackId === 'temperature') {
    const power = await json('/data/power_grid.json')
    const dates = power.months.map((m) => `${m.slice(0, 4)}-${m.slice(4, 6)}-01`)
    const values = power.months.map((month) => samplePower(power, lat, lon, month))
    const baseline = new Map()
    dates.forEach((date, i) => {
      if (Number(date.slice(0, 4)) > power.baselineEnd) return
      const month = date.slice(5, 7)
      if (!baseline.has(month)) baseline.set(month, [])
      baseline.get(month).push(values[i])
    })
    const anomaly = values.map((value, i) => {
      const list = baseline.get(dates[i].slice(5, 7))?.filter(Number.isFinite) || []
      const mean = list.length ? list.reduce((a, b) => a + b, 0) / list.length : value
      return Number.isFinite(value) ? value - mean : 0
    })
    const [min, max] = minMax(values)
    return {
      layer: trackId,
      dates,
      values,
      normalized: values.map((v) => (Number.isFinite(v) ? (v - min) / (max - min) : 0.5)),
      anomaly,
      unit: '°C',
      source: power.source,
      cached: true,
      currentIndex: frameForDate(track, track.dates[0]),
    }
  }

  const grids = await json('/data/grids.json')
  const data = grids.tracks[trackId]
  const values = data.dates.map((_, i) => sampleGrid(data.values[i], lat, lon, grids.width, grids.height))
  let anomaly
  if (trackId === 'water') {
    anomaly = values.map((v) => v ?? 0)
  } else {
    const valid = values.filter(Number.isFinite)
    const mean = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0
    anomaly = values.map((v) => (Number.isFinite(v) ? v - mean : 0))
  }
  const [min, max] = minMax(values)
  return {
    layer: trackId,
    dates: data.dates,
    values,
    normalized: values.map((v) => (Number.isFinite(v) ? (v - min) / (max - min) : 0.5)),
    anomaly: trackId === 'temperature' ? calendarAnomaly(data.dates, values) : anomaly,
    unit: trackId === 'fires' ? 'index' : trackId === 'vegetation' ? 'NDVI' : 'cm',
    source: track.source,
    cached: true,
  }
}

export async function buildLocalHotspots(trackId, date) {
  const hotspots = await json('/data/hotspots.json')
  if (trackId !== 'fires' || !hotspots.fires) return { points: [], cached: true }
  const exact = hotspots.fires.dates.indexOf(date)
  const index = exact >= 0 ? exact : 0
  return { points: hotspots.fires.frames[index] || [], cached: true }
}
