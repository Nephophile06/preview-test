import { create } from 'zustand'
import { frameForDate, trackForId, TRACKS } from '../data/tracks'

const SETTINGS_KEY = 'earth-jukebox-settings'
const ONBOARD_KEY = 'earth-jukebox-onboarded'

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
  } catch {
    return {}
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function defaultCamera() {
  const width = window.innerWidth
  const height = window.innerHeight
  const fit = Math.min(width / 360, height / 180)
  const cover = Math.max(width / 360, height / 180)
  const portrait = width < 820 || height > width
  const zoom = portrait ? clamp((cover / fit) * 0.92, 1, 4.5) : 1
  return { centerLon: 0, centerLat: 8, zoom }
}

const query = new URLSearchParams(window.location.search)
const persisted = readSettings()
const initialTrack = trackForId(query.get('track'))
const initialDate = query.get('date')
const initialFrame = query.get('frame') != null
  ? clamp(Number(query.get('frame')) || 0, 0, initialTrack.dates.length - 1)
  : frameForDate(initialTrack, initialDate || initialTrack.dates[0])
const initialLat = Number(query.get('lat'))
const initialLon = Number(query.get('lon'))
const hasQueryProbe = Number.isFinite(initialLat) && Number.isFinite(initialLon) && query.has('lat') && query.has('lon')
const firstRun = typeof localStorage !== 'undefined' && !localStorage.getItem(ONBOARD_KEY)

export const useStore = create((set, get) => ({
  trackId: initialTrack.id,
  frameIndex: initialFrame,
  probe: {
    lat: hasQueryProbe ? initialLat : initialTrack.listening.lat,
    lon: hasQueryProbe ? initialLon : initialTrack.listening.lon,
    name: hasQueryProbe ? 'Shared place' : initialTrack.listening.name,
    open: hasQueryProbe,
  },
  series: null,
  seriesStatus: 'idle',
  hotspots: null,
  frameFeatures: null,
  dataMode: 'checking',
  isPlaying: false,
  audioReady: false,
  audioStarting: false,
  audioError: null,
  volume: persisted.volume ?? 0.6,
  muted: persisted.muted ?? false,
  settings: {
    scaleMode: persisted.scaleMode ?? 'auto',
    intensity: persisted.intensity ?? 1,
    speech: persisted.speech ?? false,
    highContrast: persisted.highContrast ?? false,
    reduceMotion: persisted.reduceMotion ?? false,
    haptics: persisted.haptics ?? false,
  },
  panels: { help: false, settings: false, share: false },
  onboardingStep: firstRun ? 0 : null,
  explore: false,
  story: { active: false, step: 0, startedAt: 0 },
  camera: defaultCamera(),
  announce: { id: 0, text: '' },
  toast: null,
  exportState: 'idle',
  mapReady: false,

  setTrack: (id, opts = {}) => {
    const track = trackForId(id)
    if (track.id === get().trackId && !opts.force) return
    const state = get()
    const currentDate = trackForId(state.trackId).dates[state.frameIndex]
    const frameIndex = opts.preserveDate ? frameForDate(track, currentDate) : 0
    const probe = opts.keepProbe
      ? { ...state.probe, open: state.probe.open }
      : { ...track.listening, open: false, name: track.listening.name }
    set({
      trackId: track.id,
      frameIndex,
      probe,
      series: null,
      seriesStatus: 'loading',
      hotspots: null,
      frameFeatures: null,
      isPlaying: state.isPlaying,
      story: { active: false, step: 0, startedAt: 0 },
      camera: defaultCamera(),
    })
  },
  setFrameIndex: (index, opts = {}) => {
    const total = trackForId(get().trackId).dates.length
    let next = index
    if (opts.wrap) next = (index + total) % total
    set({ frameIndex: clamp(next, 0, total - 1) })
  },
  stepFrame: (delta, opts = {}) => {
    const total = trackForId(get().trackId).dates.length
    set({ frameIndex: (get().frameIndex + delta + total) % total })
  },
  setProbe: (probe) => set({ probe: { ...get().probe, ...probe }, series: null, seriesStatus: 'loading' }),
  setProbeOpen: (open) => set({ probe: { ...get().probe, open } }),
  toggleProbe: () => set({ probe: { ...get().probe, open: !get().probe.open } }),
  setSeries: (series) => set({ series, seriesStatus: 'ready' }),
  setSeriesStatus: (seriesStatus) => set({ seriesStatus }),
  setHotspots: (hotspots) => set({ hotspots }),
  setFrameFeatures: (frameFeatures) => set({ frameFeatures }),
  setDataMode: (dataMode) => set({ dataMode }),
  setPlayback: (isPlaying) => set({ isPlaying }),
  setAudioReady: (audioReady) => set({ audioReady }),
  setAudioStarting: (audioStarting) => set({ audioStarting }),
  setAudioError: (audioError) => set({ audioError }),
  setVolume: (volume) => {
    const v = clamp(volume, 0, 1)
    set({ volume: v, muted: v === 0 ? get().muted : false })
    persistSettings(get())
    if (v > 0) get().setMuted(false)
  },
  setMuted: (muted) => {
    set({ muted })
    persistSettings(get())
  },
  toggleMute: () => {
    set({ muted: !get().muted })
    persistSettings(get())
  },
  setSetting: (key, value) => {
    set({ settings: { ...get().settings, [key]: value } })
    persistSettings(get())
  },
  openPanel: (panel) => set({ panels: { help: panel === 'help', settings: panel === 'settings', share: panel === 'share' } }),
  closePanels: () => set({ panels: { help: false, settings: false, share: false } }),
  setOnboardingStep: (onboardingStep) => set({ onboardingStep }),
  finishOnboarding: () => {
    localStorage.setItem(ONBOARD_KEY, '1')
    set({ onboardingStep: null })
  },
  setExplore: (explore) => set({ explore }),
  toggleExplore: () => set({ explore: !get().explore }),
  startStory: () => {
    const track = trackForId(get().trackId)
    const chapter = track.story[0]
    set({
      story: { active: true, step: 0, startedAt: Date.now() },
      trackId: track.id,
      frameIndex: frameForDate(track, chapter.date),
      probe: { lat: chapter.lat, lon: chapter.lon, name: chapter.place, open: false },
      series: null,
      seriesStatus: 'loading',
      camera: { centerLon: chapter.lon, centerLat: chapter.lat, zoom: 2.05 },
      panels: { help: false, settings: false, share: false },
    })
  },
  setStoryStep: (step) => {
    const track = trackForId(get().trackId)
    const chapter = track.story[step]
    if (!chapter) return
    set({
      story: { ...get().story, step },
      frameIndex: frameForDate(track, chapter.date),
      probe: { lat: chapter.lat, lon: chapter.lon, name: chapter.place, open: false },
      series: null,
      seriesStatus: 'loading',
      camera: { centerLon: chapter.lon, centerLat: chapter.lat, zoom: 2.05 },
    })
  },
  stopStory: () => set({ story: { active: false, step: 0, startedAt: 0 } }),
  setCamera: (camera) => set({ camera: { ...get().camera, ...camera } }),
  resetCamera: () => set({ camera: defaultCamera() }),
  announceText: (text) => set({ announce: { id: get().announce.id + 1, text } }),
  showToast: (message, tone = 'default') => set({ toast: { message, tone, id: Date.now() } }),
  dismissToast: () => set({ toast: null }),
  setExportState: (exportState) => set({ exportState }),
  setMapReady: (mapReady) => set({ mapReady }),
}))

function persistSettings(state) {
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        volume: state.volume,
        muted: state.muted,
        ...state.settings,
      }),
    )
  } catch {
    // private mode
  }
}

export function currentTrack(state = useStore.getState()) {
  return trackForId(state.trackId)
}

export function currentDate(state = useStore.getState()) {
  return currentTrack(state).dates[state.frameIndex]
}

export function nextTrackId(direction = 1) {
  const index = TRACKS.findIndex((t) => t.id === useStore.getState().trackId)
  return TRACKS[(index + direction + TRACKS.length) % TRACKS.length].id
}
