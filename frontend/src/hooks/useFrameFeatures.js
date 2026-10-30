import { useEffect, useState } from 'react'
import { useStore } from '../app/store'
import { frameForDate, trackForId } from '../data/tracks'
import { analyzeFrame } from '../vision/frameAnalyzer'
import { frameSrc, loadImage, preloadFrames } from '../vision/frames'

export function useFrameFeatures() {
  const trackId = useStore((s) => s.trackId)
  const frameIndex = useStore((s) => s.frameIndex)
  const camera = useStore((s) => s.camera)
  const setFrameFeatures = useStore((s) => s.setFrameFeatures)
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })

  useEffect(() => {
    let frame = 0
    const onResize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setViewport({ width: window.innerWidth, height: window.innerHeight }))
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    let active = true
    const track = trackForId(trackId)
    const date = track.dates[frameIndex]
    const src = frameSrc(track, date)
    let timer
    loadImage(src)
      .then((img) => {
        if (!active || !img) return
        timer = window.setTimeout(() => {
          if (document.hidden) return
          const features = analyzeFrame(img, camera, viewport)
          if (active && features) setFrameFeatures(features)
        }, 60)
      })
      .catch(() => {})
    preloadFrames(track)
    const nextDate = track.dates[Math.min(track.dates.length - 1, frameIndex + 1)]
    loadImage(frameSrc(track, nextDate)).catch(() => {})
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [trackId, frameIndex, camera, viewport, setFrameFeatures])

  return { viewport }
}

export function frameIndexForDate(track, date) {
  return frameForDate(track, date)
}
