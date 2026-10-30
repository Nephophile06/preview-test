import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as engine from '../audio/engine'
import { buildPhrase, mapFeaturesToAudio } from '../audio/mappings'
import { useStore } from '../app/store'
import { indexForDate } from '../data/api'
import { trackForId } from '../data/tracks'

export function useAudio() {
  const trackId = useStore((s) => s.trackId)
  const frameIndex = useStore((s) => s.frameIndex)
  const probe = useStore((s) => s.probe)
  const series = useStore((s) => s.series)
  const frameFeatures = useStore((s) => s.frameFeatures)
  const volume = useStore((s) => s.volume)
  const muted = useStore((s) => s.muted)
  const isPlaying = useStore((s) => s.isPlaying)
  const settings = useStore((s) => s.settings)
  const setPlayback = useStore((s) => s.setPlayback)
  const setAudioReady = useStore((s) => s.setAudioReady)
  const setAudioStarting = useStore((s) => s.setAudioStarting)
  const setAudioError = useStore((s) => s.setAudioError)
  const setVolume = useStore((s) => s.setVolume)
  const toggleMute = useStore((s) => s.toggleMute)
  const setFrame = useStore((s) => s.setFrameIndex)

  const track = trackForId(trackId)
  const date = track.dates[frameIndex]

  const listening = useMemo(() => {
    const seriesIndex = series ? indexForDate(series.dates, date) : 0
    const normalized = series?.normalized?.[seriesIndex] ?? 0.5
    const anomaly = series?.anomaly?.[seriesIndex] ?? 0
    const value = series?.values?.[seriesIndex] ?? null
    return { seriesIndex, normalized, anomaly, value }
  }, [series, date])

  const params = useMemo(
    () =>
      mapFeaturesToAudio(frameFeatures || {}, track, {
        lat: probe?.lat ?? track.listening.lat,
        lon: probe?.lon ?? track.listening.lon,
        normalized: listening.normalized,
        anomaly: listening.anomaly,
        value: listening.value,
      }, settings),
    [frameFeatures, track, probe?.lat, probe?.lon, listening.normalized, listening.anomaly, listening.value, settings],
  )

  const phrase = useMemo(() => buildPhrase(series, listening.seriesIndex, 8), [series, listening.seriesIndex])

  const latest = useRef({ track, params, phrase, volume, muted, isPlaying })
  latest.current = { track, params, phrase, volume, muted, isPlaying }

  const play = useCallback(async () => {
    const state = useStore.getState()
    if (state.audioStarting || state.isPlaying) return
    setAudioStarting(true)
    setAudioError(null)
    try {
      await engine.start(latest.current.track, latest.current.params, latest.current.phrase, latest.current.volume, latest.current.muted)
      setAudioReady(true)
      setPlayback(true)
      setAudioStarting(false)
    } catch (error) {
      setAudioStarting(false)
      setPlayback(false)
      setAudioError(error?.message || 'Audio could not start.')
    }
  }, [setAudioError, setAudioStarting, setAudioReady, setPlayback])

  const pause = useCallback(() => {
    engine.pause()
    setPlayback(false)
  }, [setPlayback])

  const togglePlay = useCallback(() => {
    if (useStore.getState().isPlaying) pause()
    else play()
  }, [pause, play])

  useEffect(() => {
    const prime = () => engine.primeAudio().then(setAudioReady).catch(() => {})
    window.addEventListener('pointerdown', prime, { once: true })
    window.addEventListener('keydown', prime, { once: true })
    return () => {
      window.removeEventListener('pointerdown', prime)
      window.removeEventListener('keydown', prime)
    }
  }, [setAudioReady])

  useEffect(() => {
    if (!isPlaying) return
    engine.update({ track, params, phrase, volume, muted })
  }, [track, params, phrase, volume, muted, isPlaying])

  useEffect(() => {
    if (!isPlaying) return
    let last = 0
    const id = window.setInterval(() => {
      if (document.hidden) return
      if (settings.haptics && navigator.vibrate) {
        const now = performance.now()
        if (now - last > 520) {
          last = now
          navigator.vibrate(Math.round(10 + params.density * 28))
        }
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [isPlaying, settings.haptics, params.density])

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && useStore.getState().isPlaying) {
        engine.pause()
        setPlayback(false)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [setPlayback])

  const exploreAt = useCallback(({ midi, pan, velocity, oscillator }) => {
    engine.explore({ midi, pan, velocity, oscillator })
  }, [])

  const previewProbe = useCallback(() => {
    const state = useStore.getState()
    if (!state.isPlaying) {
      play()
      return
    }
    engine.explore({
      midi: latest.current.params.leadMidi,
      pan: latest.current.params.pan,
      velocity: 0.32,
      oscillator: latest.current.track.id === 'fires' ? 'sawtooth' : latest.current.track.id === 'water' ? 'sine' : 'triangle',
    })
  }, [play])

  return {
    track,
    date,
    params,
    phrase,
    listening,
    isPlaying,
    play,
    pause,
    togglePlay,
    previewProbe,
    setVolume,
    toggleMute,
    exploreAt,
    seek: setFrame,
  }
}
