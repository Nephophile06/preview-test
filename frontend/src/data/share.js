import { useStore } from '../app/store'
import { trackForId } from './tracks'

export function listeningUrl() {
  const { trackId, frameIndex, probe } = useStore.getState()
  const track = trackForId(trackId)
  const url = new URL(window.location.href)
  url.search = ''
  url.searchParams.set('track', trackId)
  url.searchParams.set('lat', probe.lat.toFixed(3))
  url.searchParams.set('lon', probe.lon.toFixed(3))
  url.searchParams.set('date', track.dates[frameIndex])
  return url.toString()
}

export async function copyListeningLink() {
  const url = listeningUrl()
  try {
    await navigator.clipboard.writeText(url)
    return url
  } catch {
    const input = document.createElement('textarea')
    input.value = url
    input.style.position = 'fixed'
    input.style.opacity = '0'
    document.body.appendChild(input)
    input.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(input)
    if (!ok) throw new Error('Clipboard unavailable')
    return url
  }
}
