import { useEffect } from 'react'
import { useStore } from '../app/store'
import { TRACKS } from '../data/tracks'

function isFormTarget(target) {
  if (!target) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export function useKeyboard({ togglePlay, setVolume, play, announce }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      const state = useStore.getState()
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'Escape') {
        if (state.onboardingStep != null) {
          state.finishOnboarding()
          return
        }
        if (state.story.active) {
          state.stopStory()
          return
        }
        if (state.panels.help || state.panels.settings || state.panels.share) {
          state.closePanels()
          return
        }
        if (state.probe.open) state.setProbeOpen(false)
        return
      }
      // Leave form controls and sliders their native keyboard behaviour.
      if (isFormTarget(event.target)) return
      // Space on a focused button belongs to that button, not the transport.
      if (event.code === 'Space' && ['BUTTON', 'A'].includes(event.target?.tagName)) return
      // Panels and the guided story own the keyboard until dismissed.
      if (state.panels.help || state.panels.settings || state.panels.share || state.story.active) return

      if (event.code === 'Space') {
        event.preventDefault()
        togglePlay()
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        state.stepFrame(-1)
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        state.stepFrame(1)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setVolume(Math.min(1, state.volume + 0.05))
        announce(`Volume ${Math.round(Math.min(1, state.volume + 0.05) * 100)} percent`)
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setVolume(Math.max(0, state.volume - 0.05))
        announce(`Volume ${Math.round(Math.max(0, state.volume - 0.05) * 100)} percent`)
        return
      }
      if (['1', '2', '3', '4'].includes(event.key)) {
        const track = TRACKS[Number(event.key) - 1]
        if (track) state.setTrack(track.id)
        return
      }
      if (event.key.toLowerCase() === 'p') {
        state.toggleProbe()
        announce(state.probe.open ? 'Probe panel closed.' : 'Probe panel opened.')
        return
      }
      if (event.key.toLowerCase() === 'e') {
        const turningOn = !state.explore
        state.toggleExplore()
        if (turningOn && !state.isPlaying) play()
        announce(turningOn ? 'Explore mode on. Move across the map to hear place values.' : 'Explore mode off.')
        return
      }
      if (event.key.toLowerCase() === 'm') {
        state.toggleMute()
        announce(state.muted ? 'Sound on.' : 'Sound muted.')
        return
      }
      if (event.key === '?') {
        state.openPanel(state.panels.help ? null : 'help')
        return
      }
      if (event.key.toLowerCase() === 's') {
        state.startStory()
        play()
        return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePlay, setVolume, play, announce])
}
