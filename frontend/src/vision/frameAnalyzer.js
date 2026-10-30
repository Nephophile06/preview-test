const ANALYSIS_W = 64
const ANALYSIS_H = 36

let canvas
let ctx

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v))
}

export function visibleSourceRect(img, camera, viewport) {
  const width = viewport?.width || window.innerWidth
  const height = viewport?.height || window.innerHeight
  const zoom = camera?.zoom || 1
  const scale = Math.min(width / 360, height / 180) * zoom
  const centerLon = camera?.centerLon || 0
  const centerLat = camera?.centerLat || 0
  const worldW = 360 * scale
  const worldH = 180 * scale
  const x0 = width / 2 - (centerLon + 180) * scale
  const y0 = height / 2 - (90 - centerLat) * scale
  const left = Math.max(0, x0)
  const top = Math.max(0, y0)
  const right = Math.min(width, x0 + worldW)
  const bottom = Math.min(height, y0 + worldH)
  if (right <= left || bottom <= top) return { sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight }
  return {
    sx: clamp(((left - x0) / worldW) * img.naturalWidth, 0, img.naturalWidth - 1),
    sy: clamp(((top - y0) / worldH) * img.naturalHeight, 0, img.naturalHeight - 1),
    sw: clamp(((right - left) / worldW) * img.naturalWidth, 1, img.naturalWidth),
    sh: clamp(((bottom - top) / worldH) * img.naturalHeight, 1, img.naturalHeight),
  }
}

export function analyzeFrame(img, camera, viewport) {
  if (!img || !img.naturalWidth) return null
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = ANALYSIS_W
    canvas.height = ANALYSIS_H
    ctx = canvas.getContext('2d', { willReadFrequently: true })
  }
  const rect = visibleSourceRect(img, camera, viewport)
  ctx.clearRect(0, 0, ANALYSIS_W, ANALYSIS_H)
  ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, ANALYSIS_W, ANALYSIS_H)
  const { data } = ctx.getImageData(0, 0, ANALYSIS_W, ANALYSIS_H)

  let weight = 0
  let luminance = 0
  let luminanceSq = 0
  let density = 0
  let alphaSum = 0
  let red = 0
  let green = 0
  let blue = 0
  const hueBins = new Array(12).fill(0)
  const lums = new Float32Array(ANALYSIS_W * ANALYSIS_H)

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255
    const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255
    lums[i / 4] = lum
    if (a < 0.08) continue
    weight += a
    alphaSum += a
    luminance += lum * a
    luminanceSq += lum * lum * a
    red += data[i] * a
    green += data[i + 1] * a
    blue += data[i + 2] * a
    if (lum > 0.48 || a > 0.72) density += a
    const max = Math.max(data[i], data[i + 1], data[i + 2])
    const min = Math.min(data[i], data[i + 1], data[i + 2])
    if (max !== min) {
      let h = 0
      const d = max - min
      if (max === data[i]) h = ((data[i + 1] - data[i + 2]) / d) % 6
      else if (max === data[i + 1]) h = (data[i + 2] - data[i]) / d + 2
      else h = (data[i] - data[i + 1]) / d + 4
      h = ((h * 60) + 360) % 360
      hueBins[Math.min(11, Math.floor(h / 30))] += a
    }
  }

  const meanLum = weight ? luminance / weight : 0
  const variance = weight ? Math.max(0, luminanceSq / weight - meanLum * meanLum) : 0
  let edges = 0
  for (let y = 1; y < ANALYSIS_H; y += 1) {
    for (let x = 1; x < ANALYSIS_W; x += 1) {
      const i = y * ANALYSIS_W + x
      edges += Math.abs(lums[i] - lums[i - 1]) + Math.abs(lums[i] - lums[i - ANALYSIS_W])
    }
  }
  edges = edges / (ANALYSIS_W * ANALYSIS_H * 2)

  const topHues = hueBins
    .map((v, i) => ({ hue: i * 30 + 15, weight: v }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .filter((h) => h.weight > 0)
    .map((h) => h.hue)

  return {
    hue: topHues,
    dominantHue: topHues[0] ?? 0,
    brightness: clamp(meanLum, 0, 1),
    variance: clamp(variance * 4, 0, 1),
    density: clamp(weight ? density / weight : 0, 0, 1),
    edges: clamp(edges * 6, 0, 1),
    coverage: clamp(alphaSum / (ANALYSIS_W * ANALYSIS_H), 0, 1),
    meanColor: weight
      ? { r: Math.round(red / weight), g: Math.round(green / weight), b: Math.round(blue / weight) }
      : { r: 18, g: 19, b: 19 },
    analyzedAt: performance.now(),
  }
}
