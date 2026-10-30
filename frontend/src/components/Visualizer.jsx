import { useEffect, useRef } from 'react'
import { waveform } from '../audio/engine'

export function Visualizer({ active, accent }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let values = new Float32Array(96)
    const draw = (time) => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
        canvas.width = Math.round(rect.width * dpr)
        canvas.height = Math.round(rect.height * dpr)
      }
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(249,238,216,.14)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, h / 2)
      ctx.lineTo(w, h / 2)
      ctx.stroke()

      let level = 0
      if (active) {
        level = waveform(values)
        ctx.strokeStyle = accent
        ctx.lineWidth = 1.2
        ctx.beginPath()
        for (let i = 0; i < values.length; i += 1) {
          const x = (i / (values.length - 1)) * w
          const y = h / 2 + values[i] * h * 0.7
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.globalAlpha = 0.28
        ctx.fillStyle = accent
        ctx.fillRect(0, h - 1.5, Math.min(1, level * 6) * w, 1.5)
        ctx.globalAlpha = 1
      } else {
        ctx.strokeStyle = 'rgba(249,238,216,.28)'
        ctx.beginPath()
        for (let i = 0; i <= 30; i += 1) {
          const x = (i / 30) * w
          const y = h / 2 + Math.sin(i * 0.48 + time * 0.00034) * 1.8
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active, accent])

  return (
    <div className="visualizer" title="Live sound waveform">
      <canvas ref={canvasRef} aria-label={active ? 'Live audio waveform moving with the sonification.' : 'Audio waveform, currently silent.'} role="img" />
    </div>
  )
}
