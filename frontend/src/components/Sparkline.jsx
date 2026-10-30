import { useEffect, useRef } from 'react'

export function Sparkline({ series, index, accent, label }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)
      const values = series?.normalized || []
      if (values.length < 2) return
      const padY = 5
      const xAt = (i) => (i / (values.length - 1)) * w
      const yAt = (v) => h - padY - v * (h - padY * 2)

      const fill = ctx.createLinearGradient(0, 0, 0, h)
      fill.addColorStop(0, `${accent}33`)
      fill.addColorStop(1, `${accent}00`)
      ctx.beginPath()
      ctx.moveTo(0, h)
      values.forEach((v, i) => ctx.lineTo(xAt(i), yAt(v)))
      ctx.lineTo(w, h)
      ctx.closePath()
      ctx.fillStyle = fill
      ctx.fill()

      ctx.beginPath()
      values.forEach((v, i) => {
        if (i === 0) ctx.moveTo(xAt(i), yAt(v))
        else ctx.lineTo(xAt(i), yAt(v))
      })
      ctx.strokeStyle = accent
      ctx.globalAlpha = 0.75
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.globalAlpha = 1

      const current = Math.max(0, Math.min(values.length - 1, index))
      const x = xAt(current)
      const y = yAt(values[current])
      ctx.strokeStyle = 'rgba(249,238,216,.28)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
      ctx.fillStyle = '#f9eed8'
      ctx.beginPath()
      ctx.arc(x, y, 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [series, index, accent])

  const values = series?.normalized || []
  const trend = values.length > 1 ? (values[values.length - 1] > values[0] ? 'rising' : 'falling') : 'flat'
  return <canvas ref={ref} className="spark-canvas" role="img" aria-label={label || `Time series sparkline, ${trend} overall.`} />
}
