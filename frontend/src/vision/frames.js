const imageCache = new Map()
const pixelCache = new Map()

export function frameSrc(track, date) {
  return `/frames/${track.id}/${date}.webp`
}

export function loadImage(src) {
  if (!src) return Promise.resolve(null)
  if (imageCache.has(src)) return imageCache.get(src)
  const promise = new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not load ${src}`))
    img.src = src
  })
  imageCache.set(src, promise)
  return promise
}

export function preloadFrames(track) {
  const first = Math.max(0, track.dates.length)
  for (let i = 0; i < first; i += 1) {
    loadImage(frameSrc(track, track.dates[i])).catch(() => {})
  }
}

export function getPixelBuffer(img) {
  if (!img) return null
  const key = img.src
  if (pixelCache.has(key)) return pixelCache.get(key)
  const canvas = document.createElement('canvas')
  const width = 512
  const height = 256
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  const data = ctx.getImageData(0, 0, width, height)
  const entry = { width, height, data }
  if (pixelCache.size > 6) {
    const oldest = pixelCache.keys().next().value
    pixelCache.delete(oldest)
  }
  pixelCache.set(key, entry)
  return entry
}

export function sampleFrame(img, lat, lon) {
  const buffer = getPixelBuffer(img)
  if (!buffer) return null
  const x = Math.min(buffer.width - 1, Math.max(0, Math.round(((lon + 180) / 360) * buffer.width)))
  const y = Math.min(buffer.height - 1, Math.max(0, Math.round(((90 - lat) / 180) * buffer.height)))
  const offset = (y * buffer.width + x) * 4
  const [r, g, b, a] = buffer.data.data.slice(offset, offset + 4)
  if (a < 8) return { r, g, b, a, hue: 0, saturation: 0, luminance: 0, empty: true }
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let hue = 0
  if (max !== min) {
    const d = max - min
    if (max === r) hue = ((g - b) / d) % 6
    else if (max === g) hue = (b - r) / d + 2
    else hue = (r - g) / d + 4
    hue *= 60
    if (hue < 0) hue += 360
  }
  return { r, g, b, a, hue, saturation: max === 0 ? 0 : (max - min) / max, luminance: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, empty: false }
}
