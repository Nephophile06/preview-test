import { useCallback, useEffect, useRef } from 'react'
import { useStore } from '../app/store'

export function useAnnouncer() {
  const announce = useStore((s) => s.announce)
  const speech = useStore((s) => s.settings.speech)
  const lastSpoken = useRef(0)
  const announceText = useStore((s) => s.announceText)

  useEffect(() => {
    if (!announce.text) return
    if (!speech || typeof window.speechSynthesis === 'undefined') return
    const now = performance.now()
    if (now - lastSpoken.current < 450) return
    lastSpoken.current = now
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(announce.text)
    utterance.rate = 1.02
    utterance.pitch = 0.96
    utterance.volume = 0.8
    window.speechSynthesis.speak(utterance)
  }, [announce, speech])

  useEffect(
    () => () => {
      if (typeof window.speechSynthesis !== 'undefined') window.speechSynthesis.cancel()
    },
    [],
  )

  return useCallback((text) => {
    if (!text) return
    announceText(text)
  }, [announceText])
}
