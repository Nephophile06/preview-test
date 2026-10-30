import { formatCoordinate, formatFrameDate, formatValue } from './tracks'

function zoneWord(lat) {
  const abs = Math.abs(lat)
  if (abs > 66) return 'the polar zone'
  if (abs > 45) return 'the mid-latitudes'
  if (abs > 23.5) return 'the subtropics'
  return 'the tropics'
}

export function describeValue(track, value, anomaly, lat, lon, date) {
  if (value == null || !Number.isFinite(value)) {
    return 'No data at this point on this date. Move the probe or try another month.'
  }
  const place = lat == null ? 'this place' : zoneWord(lat)
  if (track.id === 'temperature') {
    const a = Number.isFinite(anomaly) ? anomaly : 0
    const direction = a > 0.35 ? 'warmer' : a < -0.35 ? 'cooler' : 'close to'
    const harmony = a > 0.9 ? 'The harmony leans minor.' : a < -0.4 ? 'The harmony opens and brightens.' : 'The harmony sits in balance.'
    return `${formatValue(track, value)} in ${place}, ${direction} the 2016–24 average. ${harmony}`
  }
  if (track.id === 'fires') {
    const level = value > 70 ? 'Dense thermal activity' : value > 38 ? 'Scattered thermal activity' : value > 12 ? 'Light thermal activity' : 'Almost no thermal signal'
    return `${level} at this point. ${value > 45 ? 'The rhythm is fast and busy.' : 'The rhythm is sparse and dry.'}`
  }
  if (track.id === 'vegetation') {
    const level = value > 0.6 ? 'Lush green cover' : value > 0.35 ? 'Moderate green cover' : 'Sparse green cover'
    return `${level} in ${place}. ${value > 0.55 ? 'Bright, busy plucks.' : 'There is space between the notes.'}`
  }
  const level = value > 4 ? 'Water storage is above' : value < -4 ? 'Water storage is below' : 'Water storage is near'
  return `${level} the year's mean (${formatValue(track, value)}). ${value < -4 ? 'The drone has dropped.' : 'The drone floats higher.'}`
}

export function describeFrame(track, features) {
  if (!features) return track.line
  if (track.id === 'fires') {
    return features.density > 0.22
      ? 'Fires are dense across the frame; the rhythm is fast and granular.'
      : features.density > 0.08
        ? 'Scattered thermal signals; a loose, crackling pulse.'
        : 'Quiet ground; only a few embers in the rhythm.'
  }
  if (track.id === 'temperature') {
    return features.brightness > 0.57
      ? 'Warm ground fills the frame; the arpeggio climbs and the pad leans minor.'
      : 'Cool ground dominates; long, low tones with wide intervals.'
  }
  if (track.id === 'vegetation') {
    return features.density > 0.28
      ? 'Green cover is broad; bright plucks crowd the bar.'
      : 'Sparse green cover; the melody leaves room to breathe.'
  }
  return features.variance > 0.15
    ? 'Strong water contrasts; the drone breathes through a slow filter sweep.'
    : 'Smooth water storage fields; a steady, low tide of sound.'
}

export function frameAria(track, date, frameIndex, total) {
  return `${track.title}, ${formatFrameDate(date)}. Frame ${frameIndex + 1} of ${total}.`
}

export function probeAria(track, probe, value, anomaly) {
  if (!probe) return 'No probe selected.'
  return `Probe at ${formatCoordinate(probe.lat, probe.lon)}: ${formatValue(track, value)}. ${describeValue(track, value, anomaly, probe.lat, probe.lon)}`
}
