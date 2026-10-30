/**
 * Dev-only renderer used to produce the four documentation audio clips.
 * It plays the real audio engine in a browser and records the limiter output,
 * so the files match what a listener hears. Nothing here ships in the app bundle.
 */
import * as engine from '../src/audio/engine'
import { buildPhrase, mapFeaturesToAudio } from '../src/audio/mappings'
import { analyzeFrame } from '../src/vision/frameAnalyzer'
import { buildLocalSeries } from '../src/data/localData'
import { TRACKS } from '../src/data/tracks'

const CLIP_SECONDS = 18

const SCENES = {
  temperature: '2025-07-01',
  fires: '2025-10-15',
  vegetation: '2024-07-01',
  water: '2022-03-01',
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not load ${src}`))
    img.src = src
  })
}

function encodeWav(audioBuffer, peakTarget = 0.89) {
  const channels = audioBuffer.numberOfChannels
  const frames = audioBuffer.length
  const rate = audioBuffer.sampleRate
  const data = []
  let peak = 0
  for (let c = 0; c < channels; c += 1) {
    const channel = audioBuffer.getChannelData(c)
    data.push(channel)
    for (let i = 0; i < channel.length; i += 1) peak = Math.max(peak, Math.abs(channel[i]))
  }
  const scale = peak > 0 ? peakTarget / peak : 1
  const bytes = new Uint8Array(44 + frames * channels * 2)
  const view = new DataView(bytes.buffer)
  const text = (offset, value) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i))
  }
  text(0, 'RIFF')
  view.setUint32(4, 36 + frames * channels * 2, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * channels * 2, true)
  view.setUint16(32, channels * 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, frames * channels * 2, true)
  let offset = 44
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const sample = Math.max(-1, Math.min(1, data[c][i] * scale))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

async function decode(blob) {
  const context = new OfflineAudioContext(2, 1, 44100)
  return context.decodeAudioData(await blob.arrayBuffer())
}

async function clipFor(track) {
  const date = SCENES[track.id]
  const img = await loadImage(`/frames/${track.id}/${date}.webp`)
  const features = analyzeFrame(img, { centerLon: 0, centerLat: 0, zoom: 1 }, { width: 1440, height: 720 }) || {}
  const series = await buildLocalSeries(track.id, track.listening.lat, track.listening.lon)
  const seriesIndex = Math.max(0, series.dates.indexOf(date))
  const params = mapFeaturesToAudio(
    features,
    track,
    {
      lat: track.listening.lat,
      lon: track.listening.lon,
      normalized: series.normalized?.[seriesIndex] ?? 0.5,
      anomaly: series.anomaly?.[seriesIndex] ?? 0,
      value: series.values?.[seriesIndex] ?? null,
    },
    { intensity: 1, scaleMode: 'auto' },
  )
  const phrase = buildPhrase(series, seriesIndex, 8)

  await engine.start(track, params, phrase, 0.6, false)
  await new Promise((resolve) => setTimeout(resolve, 500))
  const recorded = await engine.recordClip(CLIP_SECONDS)
  engine.pause()
  await new Promise((resolve) => setTimeout(resolve, 400))

  return {
    id: track.id,
    date,
    base64: encodeWav(await decode(recorded)),
    params: {
      tempo: params.tempo,
      scale: params.scale,
      filter: params.filter,
      brightness: Number(params.brightness.toFixed(2)),
      density: Number(params.density.toFixed(2)),
      leadMidi: params.leadMidi,
      chord: params.chord,
    },
  }
}

export async function renderSamples() {
  const clips = []
  for (const track of TRACKS) {
    clips.push(await clipFor(track))
  }
  return clips
}

window.renderSamples = renderSamples
