import { useEffect } from 'react'
import { useStore } from '../app/store'
import { getHotspots, getSeries } from '../data/api'
import { trackForId } from '../data/tracks'

export function useSeries() {
  const trackId = useStore((s) => s.trackId)
  const probe = useStore((s) => s.probe)
  const frameIndex = useStore((s) => s.frameIndex)
  const storyActive = useStore((s) => s.story.active)
  const setSeries = useStore((s) => s.setSeries)
  const setSeriesStatus = useStore((s) => s.setSeriesStatus)
  const setDataMode = useStore((s) => s.setDataMode)
  const setHotspots = useStore((s) => s.setHotspots)
  const track = trackForId(trackId)
  const date = track.dates[frameIndex]

  useEffect(() => {
    let active = true
    setSeriesStatus('loading')
    getSeries(trackId, probe.lat, probe.lon)
      .then((series) => {
        if (!active) return
        setSeries(series)
        if (series.offline || series.cached) setDataMode('cache')
        else setDataMode('live')
      })
      .catch(() => {
        if (!active) return
        setSeriesStatus('error')
        setDataMode('cache')
      })
    return () => {
      active = false
    }
  }, [trackId, probe.lat, probe.lon, setSeries, setSeriesStatus, setDataMode])

  useEffect(() => {
    if (trackId !== 'fires') {
      setHotspots(null)
      return
    }
    let active = true
    getHotspots(trackId, date).then((result) => {
      if (active) setHotspots(result)
    })
    return () => {
      active = false
    }
  }, [trackId, date, storyActive, setHotspots])
}
