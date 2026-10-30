import { describe, expect, it } from 'vitest'
import { buildPhrase, mapFeaturesToAudio } from './mappings'
import { midiToNote, quantize } from './scales'
import { formatFrameDate } from '../data/tracks'

const features = {
  dominantHue: 32,
  brightness: 0.62,
  variance: 0.18,
  density: 0.34,
  edges: 0.21,
}

const tracks = [
  { id: 'temperature', bpm: 66 },
  { id: 'fires', bpm: 92 },
  { id: 'vegetation', bpm: 76 },
  { id: 'water', bpm: 58 },
]

describe('sonification mapping', () => {
  it('keeps every audio parameter finite and bounded for every track', () => {
    for (const track of tracks) {
      const params = mapFeaturesToAudio(features, track, { lat: -12, lon: 18, normalized: 0.7, anomaly: 1.2 })
      expect(Number.isFinite(params.leadMidi)).toBe(true)
      expect(Number.isFinite(params.bassMidi)).toBe(true)
      expect(params.pan).toBeGreaterThanOrEqual(-0.76)
      expect(params.pan).toBeLessThanOrEqual(0.76)
      expect(params.tempo).toBeGreaterThanOrEqual(54)
      expect(params.tempo).toBeLessThanOrEqual(112)
      expect(params.filter).toBeGreaterThanOrEqual(300)
      expect(params.filter).toBeLessThanOrEqual(5200)
      expect(params.volume).toBeGreaterThan(0)
      expect(params.volume).toBeLessThan(1.2)
      expect(params.chord).toHaveLength(3)
    }
  })

  it('is deterministic for the same inputs', () => {
    const a = mapFeaturesToAudio(features, tracks[0], { lat: 4, lon: -2, normalized: 0.4, anomaly: 0 })
    const b = mapFeaturesToAudio(features, tracks[0], { lat: 4, lon: -2, normalized: 0.4, anomaly: 0 })
    expect(a).toEqual(b)
  })

  it('moves pitch upward when the data value rises', () => {
    const cold = mapFeaturesToAudio({}, tracks[0], { normalized: 0.05, anomaly: 0 })
    const hot = mapFeaturesToAudio({}, tracks[0], { normalized: 0.95, anomaly: 0 })
    expect(hot.leadMidi).toBeGreaterThan(cold.leadMidi)
  })

  it('builds an eight-step phrase from the series', () => {
    const phrase = buildPhrase({ normalized: [0, 0.25, 0.5, 0.75, 1] }, 2)
    expect(phrase).toHaveLength(8)
    expect(phrase.every((value) => value >= 0 && value <= 1)).toBe(true)
  })

  it('converts MIDI to note names and quantises safely', () => {
    expect(midiToNote(60)).toBe('C4')
    expect(Number.isFinite(quantize(Number.NaN, 'major', 50, 2))).toBe(true)
  })
})

describe('date display', () => {
  it('never throws on malformed upstream dates', () => {
    expect(formatFrameDate('2025-13-01')).toBe('')
    expect(formatFrameDate('2025-02-01', true)).toBe('Feb 2025')
  })
})
