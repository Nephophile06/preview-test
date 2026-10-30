import { useStore } from '../app/store'
import { trackForId } from '../data/tracks'

export function Legend() {
  const trackId = useStore((s) => s.trackId)
  const storyActive = useStore((s) => s.story.active)
  const track = trackForId(trackId)
  if (storyActive) return null
  return (
    <div className="legend-card glass" aria-label={`${track.title} colour legend: ${track.legend.low} to ${track.legend.high}`}>
      <div className="legend-top">
        <span className="legend-name">{track.title}</span>
        <span className="legend-place">{track.listening.name}</span>
      </div>
      <div className="legend-bar" style={{ background: track.legend.gradient }} aria-hidden="true" />
      <div className="legend-ends">
        <span>{track.legend.low}</span>
        <span>{track.legend.high}</span>
      </div>
    </div>
  )
}
