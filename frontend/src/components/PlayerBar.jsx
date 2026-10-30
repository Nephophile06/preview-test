import { useStore } from '../app/store'
import { indexForDate } from '../data/api'
import { describeFrame, describeValue } from '../data/describe'
import { formatFrameDate, formatValue, trackForId } from '../data/tracks'
import { NextIcon, PauseIcon, PlayIcon, PrevIcon, VolumeIcon } from './Icons'
import { Visualizer } from './Visualizer'

export function PlayerBar({ onTogglePlay, onPrev, onNext, onVolume, onMute }) {
  const trackId = useStore((s) => s.trackId)
  const frameIndex = useStore((s) => s.frameIndex)
  const setFrameIndex = useStore((s) => s.setFrameIndex)
  const series = useStore((s) => s.series)
  const frameFeatures = useStore((s) => s.frameFeatures)
  const probe = useStore((s) => s.probe)
  const isPlaying = useStore((s) => s.isPlaying)
  const audioStarting = useStore((s) => s.audioStarting)
  const audioReady = useStore((s) => s.audioReady)
  const volume = useStore((s) => s.volume)
  const muted = useStore((s) => s.muted)
  const onboardingStep = useStore((s) => s.onboardingStep)
  const settings = useStore((s) => s.settings)
  const track = trackForId(trackId)
  const date = track.dates[frameIndex]
  const total = track.dates.length
  const seriesIndex = series ? indexForDate(series.dates, date) : 0
  const value = series?.values?.[seriesIndex]
  const anomaly = series?.anomaly?.[seriesIndex]
  const description = series
    ? describeValue(track, value, anomaly, probe.lat, probe.lon, date)
    : describeFrame(track, frameFeatures)
  const progress = total <= 1 ? 0 : (frameIndex / (total - 1)) * 100
  const showSoundCue = !audioReady && !isPlaying && !audioStarting && onboardingStep == null

  return (
    <>
      {showSoundCue && (
        <button className="start-cue" onClick={onTogglePlay} aria-label="Start audio and play the sonification">
          <i />
          Sound off · tap play to listen
        </button>
      )}
      <section className="player glass" aria-label="Now playing and transport">
        <div className="player-meta">
          <div className="meta-line">
            <span className="meta-track">{track.title}</span>
            <span className="meta-date">{formatFrameDate(date, true)}</span>
          </div>
          <div className="meta-value">
            {formatValue(track, value)}
            {Number.isFinite(anomaly) && track.id === 'temperature' && (
              <span>{anomaly >= 0 ? '+' : ''}{anomaly.toFixed(1)}° vs mean</span>
            )}
            {settings.speech && <span className="sr-only">. Speech descriptions are on.</span>}
          </div>
          <div className="player-desc">{description}</div>
        </div>

        <div className="transport" role="group" aria-label="Playback controls">
          <button className="transport-btn" onClick={onPrev} aria-label="Previous frame">
            <PrevIcon />
          </button>
          <button
            className={`transport-btn transport-play${audioStarting ? ' loading' : ''}`}
            onClick={onTogglePlay}
            aria-label={audioStarting ? 'Starting audio' : isPlaying ? 'Pause sonification' : 'Play sonification'}
            aria-pressed={isPlaying}
          >
            {isPlaying ? <PauseIcon size={17} /> : <PlayIcon size={17} />}
          </button>
          <button className="transport-btn" onClick={onNext} aria-label="Next frame">
            <NextIcon />
          </button>
        </div>

        <div className="timeline-wrap">
          <span className="timeline-edge" aria-hidden="true">
            {formatFrameDate(track.dates[0], true)}
          </span>
          <input
            type="range"
            className="range timeline-range"
            min="0"
            max={Math.max(0, total - 1)}
            step="1"
            value={frameIndex}
            style={{ '--progress': `${progress}%` }}
            onChange={(event) => setFrameIndex(Number(event.target.value))}
            aria-label={`Timeline for ${track.title}`}
            aria-valuetext={`${formatFrameDate(date)}, frame ${frameIndex + 1} of ${total}`}
          />
          <span className="timeline-edge" aria-hidden="true">
            {formatFrameDate(track.dates[total - 1], true)}
          </span>
        </div>

        <div className="right-cluster">
          <Visualizer active={isPlaying} accent={track.accent} />
          <div className="volume-wrap">
            <button className="icon-btn small" onClick={onMute} aria-label={muted ? 'Unmute sound' : 'Mute sound'} aria-pressed={muted}>
              <VolumeIcon muted={muted} size={16} />
            </button>
            <input
              type="range"
              className="range volume-range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              style={{ '--progress': `${(muted ? 0 : volume) * 100}%` }}
              onChange={(event) => onVolume(Number(event.target.value))}
              aria-label="Volume"
              aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)} percent`}
            />
          </div>
        </div>
      </section>
    </>
  )
}
