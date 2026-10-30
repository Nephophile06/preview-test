import { chordFor, quantize } from './scales'

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : 0))

function huePosition(trackId, hue) {
  const h = ((Number(hue) || 0) + 360) % 360
  if (trackId === 'temperature') {
    if (h > 300) return 0.05
    if (h >= 190) return 0.16 - ((h - 190) / 110) * 0.13
    if (h >= 100) return 0.36 - ((h - 100) / 90) * 0.18
    if (h >= 60) return 0.66 - ((h - 60) / 40) * 0.26
    if (h >= 30) return 0.88 - ((h - 30) / 30) * 0.2
    return 0.98
  }
  if (trackId === 'vegetation') {
    if (h < 30) return 0.08
    if (h < 60) return 0.08 + ((h - 30) / 30) * 0.26
    if (h < 130) return 0.34 + ((h - 60) / 70) * 0.64
    return 0.96
  }
  if (trackId === 'water') {
    if (h < 45) return 0.08 + (h / 45) * 0.18
    if (h < 150) return 0.26 + ((h - 45) / 105) * 0.3
    return 0.56 + (Math.min(h, 250) - 150) / 100 * 0.42
  }
  return clamp(0.55 + (h < 180 ? h / 180 : (360 - h) / 180) * 0.3)
}

function resolveScale(trackId, anomaly, settings) {
  const mode = settings?.scaleMode || 'auto'
  if (mode !== 'auto') return mode
  if (trackId === 'temperature') return anomaly > 0.9 ? 'minor' : anomaly < -0.6 ? 'major' : 'dorian'
  if (trackId === 'fires') return 'phrygian'
  if (trackId === 'vegetation') return 'majorPentatonic'
  return 'minorPentatonic'
}

export function buildPhrase(series, index, length = 8) {
  if (!series?.normalized?.length) return [0.5]
  const values = series.normalized
  const center = Math.max(0, Math.min(values.length - 1, index))
  const phrase = []
  for (let i = 0; i < length; i += 1) {
    const offset = i - Math.floor(length / 2)
    const idx = Math.min(values.length - 1, Math.max(0, center + offset))
    phrase.push(Number.isFinite(values[idx]) ? clamp(values[idx]) : 0.5)
  }
  return phrase
}

/**
 * Pure mapping from sight + data to a compact musical parameter set.
 * Every result is bounded so the engine can safely ramp it.
 */
export function mapFeaturesToAudio(features = {}, track, probeContext = {}, settings = {}) {
  const probe = probeContext || {}
  const anomalyRaw = Number.isFinite(probe.anomaly) ? probe.anomaly : 0
  const dataNorm = clamp(probe.normalized ?? 0.5)
  const brightness = clamp(features.brightness ?? 0.42)
  const variance = clamp(features.variance ?? 0.08)
  const density = clamp(features.density ?? 0.1)
  const edges = clamp(features.edges ?? 0.05)
  const hue = huePosition(track.id, features.dominantHue)
  const anomaly = clamp(anomalyRaw / (track.id === 'temperature' ? 4 : track.id === 'water' ? 18 : 40), -1, 1)
  const scale = resolveScale(track.id, anomalyRaw, settings)

  // Data leads pitch; the visible frame shades it.
  const pitchPos = clamp(dataNorm * 0.7 + hue * 0.24 + brightness * 0.06)
  const latitude = clamp(Math.abs(probe.lat ?? 0), 0, 90)
  const register = -Math.round((latitude / 90) * 7)
  const rootByTrack = { temperature: 50, fires: 45, vegetation: 55, water: 38 }
  const rootMidi = (rootByTrack[track.id] ?? 48) + register
  const leadMidi = quantize(pitchPos, scale, rootMidi + 12, 2)
  const bassMidi = quantize(clamp(pitchPos * 0.55 + 0.1), scale, rootMidi - 12, 1)
  const pan = clamp(((probe.lon ?? 0) / 180) * 0.58 + ((probe.lat ?? 0) / 90) * 0.18, -0.76, 0.76)
  const intensity = clamp(settings?.intensity ?? 1, 0.3, 1.4)
  const tempo = Math.round(clamp((track.bpm ?? 70) + density * 22 + dataNorm * 9, 54, 112))
  const rhythm = clamp(0.22 + density * 1.05 + dataNorm * 0.26)
  const filter = Math.round(clamp(360 + brightness * 2200 + dataNorm * 800, 300, 5200))
  const reverb = clamp(0.08 + variance * 0.5 + edges * 0.2, 0.06, 0.62)
  const texture = clamp(edges * 0.85 + variance * 0.9)
  const volume = clamp(0.34 + brightness * 0.22 + density * 0.16, 0.25, 0.72) * intensity

  return {
    scale,
    anomaly: Number.isFinite(anomaly) ? anomaly : 0,
    pitchPos,
    leadMidi,
    bassMidi,
    chord: chordFor(scale, rootMidi, (track.id === 'fires' ? 0 : 1)),
    pan,
    tempo,
    rhythm,
    filter,
    reverb,
    texture,
    volume,
    density,
    brightness,
    variance,
    edges,
    timbre: {
      detune: (variance - 0.2) * 16,
      noise: clamp(edges * 0.7 + (track.id === 'fires' ? density * 0.55 : density * 0.12)),
      sub: track.id === 'water' ? clamp(0.55 - dataNorm * 0.38) : track.id === 'temperature' ? 0.2 : 0.08,
    },
  }
}

export { huePosition }
