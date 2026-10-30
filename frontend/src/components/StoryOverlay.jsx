import { useEffect } from 'react'
import { motion } from 'motion/react'
import { useStore } from '../app/store'
import { trackForId } from '../data/tracks'
import { CloseIcon, NextIcon, PrevIcon } from './Icons'

const DWELL = 9000

export function StoryOverlay({ onFinish }) {
  const story = useStore((s) => s.story)
  const trackId = useStore((s) => s.trackId)
  const setStoryStep = useStore((s) => s.setStoryStep)
  const stopStory = useStore((s) => s.stopStory)
  const track = trackForId(trackId)
  const chapter = track.story[story.step]
  const isLast = story.step >= track.story.length - 1

  useEffect(() => {
    if (!story.active) return
    const timer = window.setTimeout(() => {
      if (isLast) {
        stopStory()
        onFinish?.()
      } else {
        setStoryStep(story.step + 1)
      }
    }, DWELL)
    return () => window.clearTimeout(timer)
  }, [story.active, story.step, isLast, setStoryStep, stopStory, onFinish])

  if (!story.active || !chapter) return null

  const finish = () => {
    stopStory()
    onFinish?.()
  }

  return (
    <motion.section
      className="story-card glass"
      aria-label={`Guided story, chapter ${story.step + 1} of ${track.story.length}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="story-head">
        <span className="eyebrow">Guided listening · {track.title}</span>
        <button className="icon-btn small" aria-label="End guided story" onClick={finish}>
          <CloseIcon size={14} />
        </button>
      </div>
      <div className="story-progress" aria-hidden="true">
        <motion.i
          key={story.step}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: DWELL / 1000, ease: 'linear' }}
        />
      </div>
      <h2 className="story-place">{chapter.place}</h2>
      <p className="story-text">{chapter.text}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }}>
        <span className="eyebrow">{story.step + 1} / {track.story.length}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="icon-btn small" aria-label="Previous chapter" onClick={() => setStoryStep(Math.max(0, story.step - 1))} disabled={story.step === 0}>
            <PrevIcon />
          </button>
          <button className="icon-btn small" aria-label={isLast ? 'Finish story' : 'Next chapter'} onClick={() => (isLast ? finish() : setStoryStep(story.step + 1))}>
            <NextIcon />
          </button>
        </div>
      </div>
    </motion.section>
  )
}
