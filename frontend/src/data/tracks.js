export const TRACKS = [
  {
    id: 'temperature',
    title: 'Temperature',
    shortTitle: 'Heat',
    index: 1,
    accent: '#d98c5f',
    accentSoft: 'rgba(217,140,95,.16)',
    unit: '°C',
    decimals: 1,
    legend: {
      low: 'Cold',
      high: 'Hot',
      gradient: 'linear-gradient(90deg,#27384b 0%,#3f75bb 26%,#f9eed8 53%,#d6925d 78%,#b94f38 100%)',
    },
    dates: Array.from({ length: 12 }, (_, i) => `2025-${String(i + 1).padStart(2, '0')}-01`),
    rangeLabel: 'Jan — Dec 2025',
    source: 'MODIS/Aqua land surface temperature · NASA GIBS',
    listening: { lat: 37.39, lon: -5.99, name: 'Seville, Spain' },
    scale: 'dorian',
    bpm: 66,
    line: 'Higher pitch is hotter. The pad turns minor as the warmth runs above its long-term average.',
    mapping: 'Pitch rises with heat · brighter colour opens the filter · positive anomalies darken the harmony',
    story: [
      { date: '2025-01-01', lat: 67.2, lon: 22.6, place: 'Arctic Sweden', text: 'Winter holds the north. Cold blues sit low in the scale; the pad is wide, slow and sparse.' },
      { date: '2025-04-01', lat: 27.0, lon: 15.0, place: 'Sahara', text: 'Spring sunlight floods the desert. The frame warms to cream, and the arpeggio climbs.' },
      { date: '2025-07-01', lat: 37.4, lon: -6.0, place: 'Seville, Spain', text: 'At the height of summer, heat adds pressure to the harmony. Listen for the minor third.' },
      { date: '2025-12-01', lat: -33.9, lon: 151.2, place: 'Sydney, Australia', text: 'The seasons turn south. Heat migrates below the equator and the melody pans across the stereo field.' },
    ],
  },
  {
    id: 'fires',
    title: 'Fires',
    shortTitle: 'Fire',
    index: 2,
    accent: '#c1573d',
    accentText: '#d47a5f',
    accentSoft: 'rgba(193,87,61,.18)',
    unit: 'index',
    decimals: 0,
    legend: {
      low: 'Quiet',
      high: 'Burning',
      gradient: 'linear-gradient(90deg,#f9eed8 0%,#e0a36f 55%,#b94f38 100%)',
    },
    dates: Array.from({ length: 12 }, (_, i) => `2025-${String(i + 1).padStart(2, '0')}-15`),
    rangeLabel: 'Jan — Dec 2025',
    source: 'MODIS/Terra thermal anomalies · NASA GIBS',
    listening: { lat: -12.5, lon: 18.5, name: 'Angola highlands' },
    scale: 'phrygian',
    bpm: 92,
    line: 'Each fleck is a thermal anomaly. More flecks mean a faster, denser rhythm.',
    mapping: 'Dot density sets rhythm · glow intensity sets force · edges add a dry crackle',
    story: [
      { date: '2025-01-15', lat: 8.5, lon: 2.5, place: 'West African savanna', text: 'Dry-season fires stitch a slow pulse across the savanna.' },
      { date: '2025-04-15', lat: 25.0, lon: 95.0, place: 'Northeast India', text: 'The rhythm tightens as thermal signals gather around the Himalayan foothills.' },
      { date: '2025-07-15', lat: 64.0, lon: -148.0, place: 'Alaska', text: 'Boreal fire appears at high latitude. Listen for the percussion spreading wide in the stereo field.' },
      { date: '2025-10-15', lat: -12.5, lon: 18.5, place: 'Angola highlands', text: 'Central Africa burns brightly. The densest rhythm of the year becomes a wall of clicks and embers.' },
    ],
  },
  {
    id: 'vegetation',
    title: 'Vegetation',
    shortTitle: 'Leaf',
    index: 3,
    accent: '#739a69',
    accentSoft: 'rgba(115,154,105,.17)',
    unit: 'NDVI',
    decimals: 2,
    legend: {
      low: 'Sparse',
      high: 'Lush',
      gradient: 'linear-gradient(90deg,#8b5b42 0%,#739a69 45%,#b7c498 78%,#f9eed8 100%)',
    },
    dates: ['2024-04-01', '2024-05-01', '2024-06-01', '2024-07-01', '2024-08-01', '2024-09-01', '2024-10-01', '2024-11-01', '2024-12-01', '2025-01-01', '2025-02-01', '2025-03-01'],
    rangeLabel: 'Apr 2024 — Mar 2025',
    source: 'MODIS/Terra NDVI · NASA GIBS',
    listening: { lat: -3.2, lon: -60.0, name: 'Central Amazon' },
    scale: 'majorPentatonic',
    bpm: 76,
    line: 'Greener ground makes brighter, busier plucks. Brown ground leaves space between the notes.',
    mapping: 'Greenness opens the filter · density thickens the plucks · texture adds leaf-like air',
    story: [
      { date: '2024-04-01', lat: -3.2, lon: -60.0, place: 'Central Amazon', text: 'The rainforest keeps its green through the year. A low, humid bed of sound sits beneath bright plucks.' },
      { date: '2024-07-01', lat: 13.0, lon: 2.0, place: 'Sahel', text: 'Monsoon rain wakes the Sahel. Greenness climbs and the marimba pattern fills with notes.' },
      { date: '2024-10-01', lat: 48.0, lon: 37.0, place: 'Ukrainian steppe', text: 'Harvest month. The land is still green but the pattern thins as the season turns.' },
      { date: '2025-01-01', lat: -3.2, lon: -60.0, place: 'Central Amazon', text: 'The southern tropics stay alive. Listen for the same place across time, not just across space.' },
    ],
  },
  {
    id: 'water',
    title: 'Water',
    shortTitle: 'Water',
    index: 4,
    accent: '#3f75bb',
    accentText: '#7ea6d9',
    accentSoft: 'rgba(63,117,187,.18)',
    unit: 'cm',
    decimals: 1,
    legend: {
      low: 'Dry',
      high: 'Wet',
      gradient: 'linear-gradient(90deg,#b45f43 0%,#d9cbb1 50%,#3f75bb 100%)',
    },
    dates: ['2021-08-01', '2021-09-01', '2021-10-01', '2021-11-01', '2021-12-01', '2022-01-01', '2022-02-01', '2022-03-01', '2022-04-01', '2022-05-01', '2022-06-01', '2022-07-01'],
    rangeLabel: 'Aug 2021 — Jul 2022',
    source: 'GRACE Tellus water-equivalent thickness · NASA GIBS',
    listening: { lat: 0.0, lon: 22.0, name: 'Congo Basin' },
    scale: 'minorPentatonic',
    bpm: 58,
    line: 'Blue means more water stored underground and on land. Low drones mean loss.',
    mapping: 'Storage high = brighter drone · deficit pulls the pitch down · edges add a slow filter sweep',
    story: [
      { date: '2021-08-01', lat: -3.2, lon: -60.0, place: 'Amazon Basin', text: 'In this GRACE record, the southern Amazon sits below its reference baseline. The drone settles low and the filter closes.' },
      { date: '2022-01-01', lat: -3.2, lon: -60.0, place: 'Amazon Basin, five months later', text: 'Storage returns above baseline at the same place. The notes rise and the chord opens.' },
      { date: '2022-03-01', lat: -25.0, lon: 135.0, place: 'Inland Australia', text: 'A sharp deficit appears over inland Australia. The bass line sinks beneath the melody.' },
      { date: '2022-03-01', lat: 0.0, lon: 22.0, place: 'Congo Basin', text: 'In the same month, the Congo holds a surplus. A wide, breathing chord floats above the drone.' },
    ],
  },
]

export const TRACK_BY_ID = Object.fromEntries(TRACKS.map((track) => [track.id, track]))

export const FEATURED_POINTS = Object.fromEntries(
  TRACKS.map((track) => [track.id, { ...track.listening, title: track.listening.name }]),
)

export function trackForId(id) {
  return TRACK_BY_ID[id] || TRACKS[0]
}

export function frameForDate(track, date) {
  if (!track) return 0
  const exact = track.dates.indexOf(date)
  if (exact >= 0) return exact
  const target = new Date(`${date}T12:00:00Z`).getTime()
  let best = 0
  let distance = Infinity
  track.dates.forEach((candidate, i) => {
    const d = Math.abs(new Date(`${candidate}T12:00:00Z`).getTime() - target)
    if (d < distance) {
      best = i
      distance = d
    }
  })
  return best
}

export function formatFrameDate(date, short = false) {
  if (!date) return ''
  const d = new Date(`${date}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en', {
    month: short ? 'short' : 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

export function formatValue(track, value) {
  if (value == null || Number.isNaN(value)) return '—'
  if (track.id === 'temperature') return `${value.toFixed(1)}°C`
  if (track.id === 'vegetation') return value.toFixed(2)
  if (track.id === 'water') return `${value > 0 ? '+' : ''}${value.toFixed(1)} cm`
  return `${Math.round(value)}`
}

export function formatCoordinate(lat, lon) {
  if (lat == null || lon == null) return 'No place selected'
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(1)}°${ns} ${Math.abs(lon).toFixed(1)}°${ew}`
}
