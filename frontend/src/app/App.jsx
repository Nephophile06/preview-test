import { useCallback, useEffect, useRef } from 'react'
import { recordClip } from '../audio/engine'
import { HelpDrawer } from '../components/HelpDrawer'
import { Legend } from '../components/Legend'
import { MapView } from '../components/MapView'
import { Onboarding } from '../components/Onboarding'
import { PlayerBar } from '../components/PlayerBar'
import { ProbePanel } from '../components/ProbePanel'
import { SettingsDrawer } from '../components/SettingsDrawer'
import { StoryOverlay } from '../components/StoryOverlay'
import { Toast } from '../components/Toast'
import { TopBar } from '../components/TopBar'
import { checkHealth } from '../data/api'
import { probeAria } from '../data/describe'
import { copyListeningLink } from '../data/share'
import { formatFrameDate, formatValue, trackForId } from '../data/tracks'
import { useAnnouncer } from '../hooks/useAnnouncer'
import { useAudio } from '../hooks/useAudio'
import { useFrameFeatures } from '../hooks/useFrameFeatures'
import { useKeyboard } from '../hooks/useKeyboard'
import { useSeries } from '../hooks/useSeries'
import { indexForDate } from '../data/api'
import { useStore } from './store'

export default function App() {
  const {
    track,
    params,
    isPlaying,
    play,
    pause,
    togglePlay,
    previewProbe,
    setVolume,
    toggleMute,
  } = useAudio()
  const announce = useAnnouncer()
  useSeries()
  useFrameFeatures()

  const trackId = useStore((s) => s.trackId)
  const frameIndex = useStore((s) => s.frameIndex)
  const stepFrame = useStore((s) => s.stepFrame)
  const setFrameIndex = useStore((s) => s.setFrameIndex)
  const probe = useStore((s) => s.probe)
  const series = useStore((s) => s.series)
  const settings = useStore((s) => s.settings)
  const panels = useStore((s) => s.panels)
  const story = useStore((s) => s.story)
  const announceState = useStore((s) => s.announce)
  const onboardingStep = useStore((s) => s.onboardingStep)
  const audioError = useStore((s) => s.audioError)
  const audioReady = useStore((s) => s.audioReady)
  const exportState = useStore((s) => s.exportState)
  const setExportState = useStore((s) => s.setExportState)
  const setAudioError = useStore((s) => s.setAudioError)
  const setDataMode = useStore((s) => s.setDataMode)
  const setProbe = useStore((s) => s.setProbe)
  const setProbeOpen = useStore((s) => s.setProbeOpen)
  const toggleExplore = useStore((s) => s.toggleExplore)
  const startStory = useStore((s) => s.startStory)
  const stopStory = useStore((s) => s.stopStory)
  const resetCamera = useStore((s) => s.resetCamera)
  const closePanels = useStore((s) => s.closePanels)
  const showToast = useStore((s) => s.showToast)

  const previousStory = useRef(story.active)
  const previousTrack = useRef(trackId)
  const previousFrame = useRef(frameIndex)
  const previousPlaying = useRef(isPlaying)
  const announcedProbe = useRef('')
  const previousOnboarding = useRef(onboardingStep)

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--accent', track.accent)
    root.style.setProperty('--accent-text', track.accentText || track.accent)
    root.style.setProperty('--accent-soft', track.accentSoft)
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal'
    root.dataset.motion = settings.reduceMotion ? 'reduce' : 'full'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#121313')
  }, [track, settings.highContrast, settings.reduceMotion])

  useEffect(() => {
    let active = true
    checkHealth().then((ok) => {
      if (!active) return
      if (!ok) setDataMode('cache')
    })
    const onOffline = () => {
      setDataMode('cache')
      showToast('Network offline — NASA frames and series are coming from the local cache.', 'error')
    }
    const onOnline = () => {
      checkHealth().then((ok) => {
        if (ok) {
          setDataMode('live')
          showToast('Data service reconnected.')
        }
      })
    }
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      active = false
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [setDataMode, showToast])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href)
      url.search = ''
      url.searchParams.set('track', trackId)
      url.searchParams.set('lat', probe.lat.toFixed(3))
      url.searchParams.set('lon', probe.lon.toFixed(3))
      url.searchParams.set('date', track.dates[frameIndex])
      window.history.replaceState(null, '', url)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [trackId, probe.lat, probe.lon, frameIndex, track.dates])

  useEffect(() => {
    if (!isPlaying || story.active) return
    const interval = Math.max(1350, Math.round((60 / params.tempo) * 2.6 * 1000))
    const timer = window.setInterval(() => stepFrame(1), interval)
    return () => window.clearInterval(timer)
  }, [isPlaying, story.active, params.tempo, stepFrame])

  useEffect(() => {
    if (previousTrack.current !== trackId) {
      previousTrack.current = trackId
      announce(`${track.title} track. ${track.line}`)
    }
  }, [trackId, track, announce])

  useEffect(() => {
    if (previousFrame.current !== frameIndex && !isPlaying && previousPlaying.current === false && !story.active) {
      const index = series ? indexForDate(series.dates, track.dates[frameIndex]) : 0
      const value = series?.values?.[index]
      announce(`${formatFrameDate(track.dates[frameIndex])}. ${formatValue(track, value)} at this probe.`)
    }
    previousFrame.current = frameIndex
    previousPlaying.current = isPlaying
  }, [frameIndex, isPlaying, series, track, story.active, announce])

  useEffect(() => {
    if (!probe.open || !series) return
    const key = `${trackId}:${probe.lat.toFixed(2)}:${probe.lon.toFixed(2)}`
    if (announcedProbe.current === key) return
    announcedProbe.current = key
    const index = indexForDate(series.dates, track.dates[frameIndex])
    announce(probeAria(track, probe, series.values?.[index], series.anomaly?.[index]))
  }, [probe, series, trackId, track, frameIndex, announce])

  useEffect(() => {
    if (previousStory.current && !story.active) {
      resetCamera()
      if (isPlaying) pause()
      announce('Guided story ended. The map is yours again.')
    }
    previousStory.current = story.active
  }, [story.active, isPlaying, pause, resetCamera, announce])

  useEffect(() => {
    if (story.active) {
      const chapter = track.story[story.step]
      if (chapter) announce(`Chapter ${story.step + 1} of ${track.story.length}. ${chapter.place}. ${chapter.text}`)
    }
  }, [story.active, story.step, track, announce])

  useEffect(() => {
    if (audioError) {
      showToast(audioError, 'error')
      setAudioError(null)
    }
  }, [audioError, showToast, setAudioError])

  useEffect(() => {
    if (previousOnboarding.current != null && onboardingStep == null) {
      showToast(audioReady ? 'You are ready. Tap the Earth to hear any place.' : 'Tap play whenever you want to start the sound.')
    }
    previousOnboarding.current = onboardingStep
  }, [onboardingStep, audioReady, showToast])

  const handleProbe = useCallback((lat, lon) => {
    setProbe({ lat, lon, name: 'Map probe', open: true })
    setProbeOpen(true)
    if (!useStore.getState().isPlaying) play()
  }, [setProbe, setProbeOpen, play])

  const handleExplore = useCallback(() => {
    const turningOn = !useStore.getState().explore
    toggleExplore()
    if (turningOn && !useStore.getState().isPlaying) play()
    announce(turningOn ? 'Explore mode on. Move your cursor across the map to hear place values.' : 'Explore mode off.')
  }, [toggleExplore, play, announce])

  const handleStory = useCallback(async () => {
    if (useStore.getState().story.active) {
      stopStory()
      return
    }
    startStory()
    if (!useStore.getState().isPlaying) {
      await play()
    }
  }, [startStory, stopStory, play])

  const handleStartAudio = useCallback(async () => {
    if (!useStore.getState().isPlaying) await play()
  }, [play])

  const handleShare = useCallback(async () => {
    try {
      await copyListeningLink()
      showToast('Listening link copied.')
    } catch {
      showToast('Clipboard access is unavailable in this browser.', 'error')
    }
  }, [showToast])

  const handleExport = useCallback(async () => {
    if (useStore.getState().exportState === 'recording') return
    try {
      if (!useStore.getState().isPlaying) await play()
      setExportState('recording')
      showToast('Recording 20 seconds of the live mix. Keep this tab visible.')
      await new Promise((resolve) => setTimeout(resolve, 350))
      const blob = await recordClip(20)
      const href = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const state = useStore.getState()
      const t = trackForId(state.trackId)
      link.href = href
      link.download = `earth-jukebox-${state.trackId}-${t.dates[state.frameIndex]}.webm`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(href), 3000)
      setExportState('idle')
      showToast('Postcard exported. It includes the current probe and mix.')
    } catch (error) {
      setExportState('idle')
      showToast(error?.message || 'Audio export failed.', 'error')
    }
  }, [play, setExportState, showToast])

  useKeyboard({ togglePlay, setVolume, play, announce })

  const handlePrev = () => stepFrame(-1)
  const handleNext = () => stepFrame(1)

  return (
    <div className="app">
      <a className="skip-link" href="#main-map">Skip to the map</a>
      <h1 className="sr-only">Earth Jukebox — NASA Earth science as a living instrument</h1>

      <TopBar onStory={handleStory} onExplore={handleExplore} />
      <main style={{ position: 'absolute', inset: 0 }}>
        <MapView onProbe={handleProbe} announce={announce} />
      </main>

      <Legend />
      <div className="map-credit">
        NASA GIBS · NASA POWER
        <br />
        Interactive data plate · frames cached
      </div>

      <ProbePanel onPreview={previewProbe} />

      {story.active && <StoryOverlay onFinish={stopStory} />}

      <PlayerBar
        onTogglePlay={togglePlay}
        onPrev={handlePrev}
        onNext={handleNext}
        onVolume={setVolume}
        onMute={toggleMute}
      />

      {onboardingStep != null && <Onboarding onStartAudio={handleStartAudio} />}
      {panels.help && <HelpDrawer />}
      {panels.settings && <SettingsDrawer onExport={handleExport} onShare={handleShare} />}

      {exportState === 'recording' && (
        <div className="toast recording-pill" role="status"><i className="toast-dot" />Recording live mix…</div>
      )}
      <Toast />
      <div className="grain" aria-hidden="true" />
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        <span key={announceState.id}>{announceState.text}</span>
      </div>
    </div>
  )
}
