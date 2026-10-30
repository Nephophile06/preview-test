import { buildLocalHotspots, buildLocalSeries } from './localData'

const memo = new Map()

async function timedFetch(url, ms = 4500) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

export async function getSeries(trackId, lat, lon, options = {}) {
  const key = `series:${trackId}:${lat.toFixed(2)}:${lon.toFixed(2)}`
  if (memo.has(key)) return memo.get(key)
  const query = new URLSearchParams({ layer: trackId, lat: String(lat), lon: String(lon) })
  if (options.start) query.set('start', options.start)
  if (options.end) query.set('end', options.end)
  const request = timedFetch(`/api/series?${query}`, 5500)
    .then((data) => ({ ...data, offline: false }))
    .catch(async () => {
      const local = await buildLocalSeries(trackId, lat, lon)
      return { ...local, offline: true, cached: true }
    })
  memo.set(key, request)
  return request
}

export async function getHotspots(trackId, date) {
  const key = `hotspots:${trackId}:${date}`
  if (memo.has(key)) return memo.get(key)
  const query = new URLSearchParams({ layer: trackId, date })
  const request = timedFetch(`/api/hotspots?${query}`, 4000)
    .then((data) => ({ ...data, offline: false }))
    .catch(async () => {
      const local = await buildLocalHotspots(trackId, date)
      return { ...local, offline: true }
    })
  memo.set(key, request)
  return request
}

export async function getDescription(trackId, lat, lon, date) {
  try {
    const query = new URLSearchParams({ layer: trackId, lat: String(lat), lon: String(lon), date })
    return await timedFetch(`/api/describe?${query}`, 3000)
  } catch {
    return null
  }
}

export async function checkHealth() {
  try {
    const data = await timedFetch('/api/health', 1800)
    return data.status === 'ok'
  } catch {
    return false
  }
}

export function clearApiMemo() {
  memo.clear()
}

export function indexForDate(dates, date) {
  if (!dates?.length) return 0
  const exact = dates.indexOf(date)
  if (exact >= 0) return exact
  const target = new Date(`${date}T12:00:00Z`).getTime()
  let best = 0
  let distance = Infinity
  dates.forEach((candidate, i) => {
    const d = Math.abs(new Date(`${candidate}T12:00:00Z`).getTime() - target)
    if (d < distance) {
      best = i
      distance = d
    }
  })
  return best
}
