import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { useStore } from '../app/store'

const STEPS = [
  {
    title: 'Choose a track',
    text: 'Four NASA datasets, four instruments. Temperature, fires, vegetation and water each have their own voice.',
    action: 'Next',
    target: '[aria-label="Choose a NASA data track"]',
  },
  {
    title: 'Press play',
    text: 'Audio starts only when you ask. The Earth will begin to sing from the frame and the data under the listening point.',
    action: 'Start the sound',
    target: '.transport-play',
  },
  {
    title: 'Tap the Earth',
    text: 'Touch anywhere on the map to place a probe. You will hear that place, read its value, and see its history.',
    action: 'Enter the map',
    target: '.map-shell',
  },
]

export function Onboarding({ onStartAudio }) {
  const step = useStore((s) => s.onboardingStep)
  const setStep = useStore((s) => s.setOnboardingStep)
  const finish = useStore((s) => s.finishOnboarding)
  const setTrack = useStore((s) => s.setTrack)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (step == null) return
    const target = document.querySelector(STEPS[step].target)
    target?.classList.add('coach-target')
    buttonRef.current?.focus?.()
    return () => target?.classList.remove('coach-target')
  }, [step])

  if (step == null) return null
  const current = STEPS[step]

  const advance = async () => {
    if (step === 1) {
      await onStartAudio?.()
    }
    if (step === 2) {
      finish()
      return
    }
    setStep(step + 1)
  }

  return (
    <>
      <div className="coach-scrim" />
      <motion.div
        className={`coach-card step-${step} glass-strong`}
        role="dialog"
        aria-modal="false"
        aria-label={`Getting started, step ${step + 1} of 3`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        <div className="coach-step" aria-hidden="true">
          {[0, 1, 2].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}
        </div>
        <span className="eyebrow">First listen · {step + 1} of 3</span>
        <h2 className="coach-title">{current.title}</h2>
        <p className="coach-text">{current.text}</p>
        {step === 0 && (
          <p className="coach-text" style={{ marginTop: -6, fontSize: 10 }}>
            Try <strong style={{ color: 'var(--cream)' }}>1–4</strong> on a keyboard, or tap a track above.
          </p>
        )}
        <div className="coach-actions">
          <button className="coach-skip" onClick={finish}>Skip intro</button>
          <button ref={buttonRef} className="button primary" onClick={advance}>
            {current.action}
          </button>
        </div>
      </motion.div>
    </>
  )
}
