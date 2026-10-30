import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useStore } from '../app/store'
import { explore as playExploreNote } from '../audio/engine'
import { huePosition } from '../audio/mappings'
import { quantize } from '../audio/scales'
import { formatCoordinate, trackForId } from '../data/tracks'
import { frameSrc, loadImage, sampleFrame } from '../vision/frames'

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

function mapScale(width, height, zoom) {
  return Math.min(width / 360, height / 180) * zoom
}

function mapRectFor(width, height, camera) {
  const scale = mapScale(width, height, camera.zoom)
  return {
    scale,
    x: width / 2 - (camera.centerLon + 180) * scale,
    y: height / 2 - (90 - camera.centerLat) * scale,
    w: 360 * scale,
    h: 180 * scale,
  }
}

function project(lat, lon, width, height, camera) {
  const scale = mapScale(width, height, camera.zoom)
  return {
    x: width / 2 + (lon - camera.centerLon) * scale,
    y: height / 2 - (lat - camera.centerLat) * scale,
    scale,
  }
}

function unproject(x, y, width, height, camera) {
  const scale = mapScale(width, height, camera.zoom)
  return {
    lat: clamp(camera.centerLat - (y - height / 2) / scale, -89, 89),
    lon: ((((camera.centerLon + (x - width / 2) / scale + 180) % 360) + 360) % 360) - 180,
    scale,
  }
}

function drawBaseTexture(ctx, img, width, height) {
  if (!img?.naturalWidth) return
  const cover = Math.max(width / img.naturalWidth, height / img.naturalHeight)
  const w = img.naturalWidth * cover
  const h = img.naturalHeight * cover
  ctx.save()
  ctx.globalAlpha = 0.3
  ctx.filter = 'grayscale(1) brightness(.28) contrast(1.15) sepia(.2)'
  ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h)
  ctx.restore()
}

function drawFrame(ctx, img, rect) {
  if (!img?.naturalWidth) return
  ctx.save()
  ctx.globalAlpha = 0.16
  ctx.globalCompositeOperation = 'screen'
  ctx.filter = 'blur(16px)'
  ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h)
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = 0.94
  ctx.globalCompositeOperation = 'source-over'
  ctx.filter = 'saturate(1.08) contrast(1.02)'
  ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h)
  ctx.restore()
}

function drawGraticule(ctx, width, height, rect, camera) {
  ctx.save()
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(249,238,216,.055)'
  ctx.beginPath()
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = width / 2 + (lon - camera.centerLon) * rect.scale
    if (x < -1 || x > width + 1) continue
    ctx.moveTo(x, Math.max(0, rect.y))
    ctx.lineTo(x, Math.min(height, rect.y + rect.h))
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = height / 2 - (lat - camera.centerLat) * rect.scale
    if (y < -1 || y > height + 1) continue
    ctx.moveTo(Math.max(0, rect.x), y)
    ctx.lineTo(Math.min(width, rect.x + rect.w), y)
  }
  ctx.stroke()

  ctx.fillStyle = 'rgba(249,238,216,.26)'
  ctx.font = '8px ui-sans-serif, system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  const left = Math.max(12, rect.x + 6)
  const right = Math.min(width - 12, rect.x + rect.w - 4)
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = height / 2 - (lat - camera.centerLat) * rect.scale
    if (y < 66 || y > height - 76) continue
    const label = lat === 0 ? '0°' : `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`
    ctx.fillText(label, left, y - 6)
    ctx.fillText(label, right - ctx.measureText(label).width, y - 6)
  }
  for (let lon = -120; lon <= 120; lon += 60) {
    const x = width / 2 + (lon - camera.centerLon) * rect.scale
    if (x < 36 || x > width - 36) continue
    if (rect.y + rect.h < 80 || rect.y > height - 80) continue
    const label = lon === 0 ? '0°' : `${Math.abs(lon)}°${lon > 0 ? 'E' : 'W'}`
    ctx.fillText(label, x - ctx.measureText(label).width / 2, Math.min(height - 74, rect.y + rect.h - 8))
  }
  ctx.restore()
}

function drawAtmosphere(ctx, width, height) {
  const top = ctx.createLinearGradient(0, 0, 0, Math.min(150, height * 0.22))
  top.addColorStop(0, 'rgba(18,19,19,.7)')
  top.addColorStop(1, 'rgba(18,19,19,0)')
  ctx.fillStyle = top
  ctx.fillRect(0, 0, width, Math.min(150, height * 0.22))

  const bottom = ctx.createLinearGradient(0, height, 0, height - Math.min(190, height * 0.28))
  bottom.addColorStop(0, 'rgba(18,19,19,.86)')
  bottom.addColorStop(1, 'rgba(18,19,19,0)')
  ctx.fillStyle = bottom
  ctx.fillRect(0, height - Math.min(190, height * 0.28), width, Math.min(190, height * 0.28))

  const vignette = ctx.createRadialGradient(width / 2, height * 0.46, Math.min(width, height) * 0.24, width / 2, height * 0.48, Math.max(width, height) * 0.72)
  vignette.addColorStop(0, 'rgba(18,19,19,0)')
  vignette.addColorStop(0.7, 'rgba(18,19,19,.12)')
  vignette.addColorStop(1, 'rgba(18,19,19,.62)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)
}

export function MapView({ onProbe, announce }) {
  const trackId = useStore((s) => s.trackId)
  const frameIndex = useStore((s) => s.frameIndex)
  const camera = useStore((s) => s.camera)
  const setCamera = useStore((s) => s.setCamera)
  const probe = useStore((s) => s.probe)
  const setProbeOpen = useStore((s) => s.setProbeOpen)
  const explore = useStore((s) => s.explore)
  const onboardingStep = useStore((s) => s.onboardingStep)
  const storyActive = useStore((s) => s.story.active)
  const setMapReady = useStore((s) => s.setMapReady)
  const track = trackForId(trackId)
  const date = track.dates[frameIndex]

  const shellRef = useRef(null)
  const canvasRef = useRef(null)
  const baseRef = useRef(null)
  const dataRef = useRef(null)
  const sizeRef = useRef({ width: window.innerWidth, height: window.innerHeight })
  const dragRef = useRef(null)
  const hoverRaf = useRef(0)
  const [dataReady, setDataReady] = useState(false)
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [hover, setHover] = useState(null)
  const [mobileHint, setMobileHint] = useState(true)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const { width, height } = sizeRef.current
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#121313'
    ctx.fillRect(0, 0, width, height)

    drawBaseTexture(ctx, baseRef.current, width, height)

    const rect = mapRectFor(width, height, camera)
    ctx.save()
    ctx.globalAlpha = 0.72
    ctx.filter = 'grayscale(1) brightness(.48) contrast(1.2) sepia(.35)'
    if (baseRef.current?.naturalWidth) ctx.drawImage(baseRef.current, rect.x, rect.y, rect.w, rect.h)
    ctx.restore()

    // A faint cream veil gives the data plate its warm, printed quality.
    ctx.save()
    ctx.globalCompositeOperation = 'soft-light'
    ctx.fillStyle = 'rgba(249,238,216,.16)'
    ctx.fillRect(Math.max(0, rect.x), Math.max(66, rect.y), Math.min(width, rect.w), Math.min(height - 130, rect.h))
    ctx.restore()

    drawFrame(ctx, dataRef.current, rect)
    drawGraticule(ctx, width, height, rect, camera)

    ctx.save()
    ctx.strokeStyle = 'rgba(249,238,216,.07)'
    ctx.lineWidth = 1
    ctx.strokeRect(Math.max(0.5, rect.x), Math.max(0.5, rect.y), Math.min(width - 1, rect.w), Math.min(height - 1, rect.h))
    ctx.restore()

    drawAtmosphere(ctx, width, height)
  }, [camera])

  useLayoutEffect(() => {
    sizeRef.current = { width: window.innerWidth, height: window.innerHeight }
    draw()
  }, [draw])

  useEffect(() => {
    const onResize = () => {
      const next = { width: window.innerWidth, height: window.innerHeight }
      sizeRef.current = next
      setViewport(next)
      draw()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [draw])

  useEffect(() => {
    let active = true
    loadImage('/frames/base.webp')
      .then((img) => {
        if (!active) return
        baseRef.current = img
        draw()
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [draw])

  useEffect(() => {
    let active = true
    dataRef.current = null
    setDataReady(false)
    loadImage(frameSrc(track, date))
      .then((img) => {
        if (!active) return
        dataRef.current = img
        setDataReady(true)
        draw()
        setMapReady(true)
      })
      .catch(() => {
        if (active) setDataReady(false)
      })
    return () => {
      active = false
    }
  }, [track, date, draw, setMapReady])

  useEffect(() => {
    if (!probe.open) setMobileHint(false)
  }, [probe.open])

  const updateCameraFromDrag = (dx, dy) => {
    const { width, height } = sizeRef.current
    const next = { ...useStore.getState().camera }
    const baseScale = mapScale(width, height, next.zoom)
    const worldW = 360 * baseScale
    const worldH = 180 * baseScale
    const maxLon = worldW > width ? (worldW - width) / 2 / baseScale : 0
    const maxLat = worldH > height ? (worldH - height) / 2 / baseScale : 0
    next.centerLon = maxLon ? clamp(next.centerLon - dx / baseScale, -maxLon, maxLon) : 0
    next.centerLat = maxLat ? clamp(next.centerLat + dy / baseScale, -maxLat, maxLat) : 0
    setCamera(next)
  }

  const handlePointerDown = (event) => {
    if (event.button != null && event.button !== 0) return
    shellRef.current?.focus({ preventScroll: true })
    dragRef.current = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false, started: performance.now() }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event) => {
    const { width, height } = sizeRef.current
    const drag = dragRef.current
    if (drag) {
      const dx = event.clientX - drag.lastX
      const dy = event.clientY - drag.lastY
      if (drag.moved || Math.abs(event.clientX - drag.x) + Math.abs(event.clientY - drag.y) > 5) {
        drag.moved = true
        drag.lastX = event.clientX
        drag.lastY = event.clientY
        updateCameraFromDrag(dx, dy)
      }
      return
    }
    if (!explore || event.pointerType === 'touch') return
    cancelAnimationFrame(hoverRaf.current)
    hoverRaf.current = requestAnimationFrame(() => {
      const state = useStore.getState()
      const point = unproject(event.clientX, event.clientY, width, height, state.camera)
      const pixel = sampleFrame(dataRef.current, point.lat, point.lon)
      if (!pixel || pixel.empty) {
        setHover(null)
        return
      }
      const series = state.series
      let dataNorm = 0.5
      if (series?.dates?.length) {
        const target = state.trackId === 'temperature'
          ? series.dates.findIndex((d) => d.slice(0, 7) === track.dates[state.frameIndex].slice(0, 7))
          : state.frameIndex
        if (target >= 0) dataNorm = series.normalized?.[target] ?? 0.5
      }
      const pitchPos = clamp(dataNorm * 0.55 + huePosition(track.id, pixel.hue) * 0.32 + pixel.luminance * 0.13)
      const mode = state.settings.scaleMode === 'auto' ? track.scale : state.settings.scaleMode
      const midi = quantize(pitchPos, mode, state.trackId === 'water' ? 38 : 50, 2)
      playExploreNote({
        midi,
        pan: clamp((point.lon / 180) * 0.7, -0.8, 0.8),
        velocity: 0.1 + pixel.luminance * 0.34,
        oscillator: track.id === 'fires' ? 'sawtooth' : track.id === 'water' ? 'sine' : 'triangle',
      })
      setHover({ x: event.clientX, y: event.clientY, value: dataNorm, lat: point.lat, lon: point.lon })
    })
  }

  const finishPointer = (event) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return
    const moved = drag.moved
    const duration = performance.now() - drag.started
    if (moved || duration > 850) return
    const { width, height } = sizeRef.current
    const point = unproject(event.clientX, event.clientY, width, height, camera)
    const rect = mapRectFor(width, height, camera)
    if (event.clientX < Math.max(0, rect.x) || event.clientX > Math.min(width, rect.x + rect.w)) return
    if (event.clientY < Math.max(0, rect.y) || event.clientY > Math.min(height, rect.y + rect.h)) return
    onProbe(point.lat, point.lon)
    announce(`Probe set at ${formatCoordinate(point.lat, point.lon)}. Loading its data melody.`)
  }

  const handlePointerUp = (event) => {
    finishPointer(event)
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    } catch {
      // pointer already released
    }
  }

  const handleWheel = (event) => {
    if (!event.ctrlKey && Math.abs(event.deltaY) < 2) return
    event.preventDefault()
    const state = useStore.getState()
    const direction = event.deltaY > 0 ? -1 : 1
    const zoom = clamp(state.camera.zoom * (direction > 0 ? 1.12 : 0.89), 1, 4.8)
    setCamera({ ...state.camera, zoom })
  }

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    shell.addEventListener('wheel', handleWheel, { passive: false })
    return () => shell.removeEventListener('wheel', handleWheel)
  })

  const handleKeyDown = (event) => {
    const state = useStore.getState()
    const step = event.shiftKey ? 15 : 5
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
      event.stopPropagation()
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      let lat = state.probe.lat
      let lon = state.probe.lon
      if (event.key === 'ArrowLeft') lon -= step
      if (event.key === 'ArrowRight') lon += step
      if (event.key === 'ArrowUp') lat += step
      if (event.key === 'ArrowDown') lat -= step
      lat = clamp(lat, -85, 85)
      lon = ((((lon + 180) % 360) + 360) % 360) - 180
      onProbe(lat, lon, { fromKeyboard: true })
      announce(`Probe at ${formatCoordinate(lat, lon)}.`)
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      setProbeOpen(true)
      announce(`Probe panel opened for ${formatCoordinate(state.probe.lat, state.probe.lon)}.`)
    }
  }

  const { width, height } = viewport
  const pinPoint = project(probe.lat, probe.lon, width, height, camera)
  const rect = mapRectFor(width, height, camera)
  const pinVisible =
    pinPoint.x > Math.max(0, rect.x) + 10 &&
    pinPoint.x < Math.min(width, rect.x + rect.w) - 10 &&
    pinPoint.y > Math.max(0, rect.y) + 10 &&
    pinPoint.y < Math.min(height, rect.y + rect.h) - 10

  return (
    <div
      ref={shellRef}
      id="main-map"
      className={`map-shell${explore ? ' is-explore' : ''}`}
      role="application"
      tabIndex={0}
      aria-label={`Interactive world map showing ${track.title}. Use arrow keys to move the listening probe, Enter to open its details, and Space to play or pause. Explore mode uses the pointer.`}
      aria-describedby="map-help"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { dragRef.current = null }}
      onPointerLeave={() => setHover(null)}
      onKeyDown={handleKeyDown}
    >
      <canvas ref={canvasRef} className="map-canvas" aria-hidden="true" />
      <p id="map-help" className="sr-only">
        The map is an equirectangular NASA data frame. Drag to roam, use the mouse wheel to zoom, and tap to place a probe.
      </p>

      {pinVisible && (
        <button
          className="map-pin"
          style={{ left: pinPoint.x, top: pinPoint.y }}
          aria-label={`Listening probe at ${formatCoordinate(probe.lat, probe.lon)}. Open probe panel.`}
          aria-expanded={probe.open}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            setProbeOpen(true)
          }}
        >
          {probe.open && <span className="pin-ring" />}
          {probe.open && <span className="pin-label">{probe.name === 'Shared place' ? 'probe' : probe.name}</span>}
        </button>
      )}

      {hover && explore && (
        <div className="map-hover" style={{ left: hover.x, top: hover.y }}>
          {formatCoordinate(hover.lat, hover.lon)} · value {(hover.value * 100).toFixed(0)}
        </div>
      )}

      {!dataReady && (
        <div className="map-hint" role="status">
          <span className="skeleton" style={{ display: 'inline-block', width: 100, height: 10, verticalAlign: 'middle' }} />{' '}
          loading NASA frame
        </div>
      )}

      {dataReady && !probe.open && !onboardingStep && !storyActive && mobileHint && (
        <div className="map-hint">
          <strong>Tap the Earth</strong> to hear a place · drag to roam
        </div>
      )}
    </div>
  )
}
