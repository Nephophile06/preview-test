import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useStore } from '../app/store'
import { indexForDate } from '../data/api'
import { describeValue } from '../data/describe'
import { formatCoordinate, formatFrameDate, formatValue, trackForId } from '../data/tracks'
import { copyListeningLink } from '../data/share'
import { CloseIcon, ShareIcon, SparkIcon } from './Icons'
import { Sparkline } from './Sparkline'

export function ProbePanel({ onPreview }) {
  const trackId = useStore((s) => s.trackId)
  const frameIndex = useStore((s) => s.frameIndex)
  const probe = useStore((s) => s.probe)
  const series = useStore((s) => s.series)
  const status = useStore((s) => s.seriesStatus)
  const setProbeOpen = useStore((s) => s.setProbeOpen)
  const showToast = useStore((s) => s.showToast)
  const isPlaying = useStore((s) => s.isPlaying)
  const [compare, setCompare] = useState(false)
  const track = trackForId(trackId)
  const date = track.dates[frameIndex]
  const index = series ? indexForDate(series.dates, date) : 0
  const value = series?.values?.[index]
  const anomaly = series?.anomaly?.[index]
  const compareIndex = series && index - 12 >= 0 ? index - 12 : null
  const firstSeriesDate = series?.dates?.[0] || date
  const lastSeriesDate = series?.dates?.length ? series.dates[series.dates.length - 1] : date
  const meanValue = useMemo(() => {
    if (!series?.values?.length) return null
    const nums = series.values.filter(Number.isFinite)
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
  }, [series])

  if (!probe.open) return null

  const copy = async () => {
    try {
      await copyListeningLink()
      showToast('Listening link copied. It carries the track, place and date.')
    } catch {
      showToast('Could not copy the link — your browser blocked clipboard access.', 'error')
    }
  }

  const deltaLabel = () => {
    if (!Number.isFinite(anomaly)) return ''
    if (track.id === 'temperature') return `${anomaly >= 0 ? '+' : ''}${anomaly.toFixed(1)}° vs 2016–24`
    if (track.id === 'water') return `${anomaly >= 0 ? '+' : ''}${anomaly.toFixed(1)} cm vs mean`
    if (track.id === 'vegetation') return `${anomaly >= 0 ? '+' : ''}${anomaly.toFixed(2)} vs mean`
    return `${anomaly >= 0 ? '+' : ''}${anomaly.toFixed(0)} vs mean`
  }

  return (
    <motion.aside
      className="probe-panel glass"
      role="region"
      aria-label={`Listening probe at ${formatCoordinate(probe.lat, probe.lon)}`}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="probe-head">
        <div className="probe-location">
          <span className="eyebrow">Listening probe</span>
          <span className="probe-name">{probe.name || 'Map probe'}</span>
          <span className="probe-coords">{formatCoordinate(probe.lat, probe.lon)}</span>
        </div>
        <button className="icon-btn small" aria-label="Close probe panel" onClick={() => setProbeOpen(false)}>
          <CloseIcon size={15} />
        </button>
      </div>

      {status === 'loading' && !series ? (
        <div aria-label="Loading probe data">
          <div className="skeleton" style={{ width: 92, height: 30, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '100%', height: 38, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '80%', height: 11 }} />
        </div>
      ) : (
        <>
          <div className="probe-value-row">
            <span className="probe-value">{formatValue(track, value)}</span>
            <span className="probe-delta">{deltaLabel()}</span>
          </div>
          <p className="probe-desc">{describeValue(track, value, anomaly, probe.lat, probe.lon, date)}</p>
          <div className="spark-wrap">
            <Sparkline
              series={series}
              index={index}
              accent={track.accent}
              label={`${track.title} time series at this place. ${series?.values?.length || 0} samples.`}
            />
          </div>
          <div className="spark-dates" aria-hidden="true">
            <span>{formatFrameDate(firstSeriesDate, true)}</span>
            <span>{formatFrameDate(lastSeriesDate, true)}</span>
          </div>

          {compare && (
            <div className="probe-compare" aria-label="Comparison values">
              <div className="ab-cell">
                <div className="ab-label">A · Now</div>
                <div className="ab-value">{formatValue(track, value)}</div>
              </div>
              <div className="ab-cell">
                <div className="ab-label">{compareIndex != null ? 'B · 12 mo ago' : 'B · Mean'}</div>
                <div className="ab-value">{formatValue(track, compareIndex != null ? series?.values?.[compareIndex] : meanValue)}</div>
              </div>
            </div>
          )}

          <div className="probe-actions">
            <button className="probe-action" onClick={() => onPreview?.(track, series, index)} disabled={status === 'loading'}>
              <SparkIcon size={13} />
              {isPlaying ? 'Hear this place' : 'Play this place'}
            </button>
            <button className="probe-action" onClick={() => setCompare((v) => !v)} aria-pressed={compare}>
              A / B
            </button>
            <button className="probe-action icon-only" onClick={copy} aria-label="Copy a link to this listening view" title="Copy listening link">
              <ShareIcon />
            </button>
          </div>
          <div className="eyebrow" style={{ marginTop: 8, color: 'var(--cream-50)', lineHeight: 1.5 }}>
            {series?.source || track.source}
          </div>
        </>
      )}
    </motion.aside>
  )
}
