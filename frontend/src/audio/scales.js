export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function midiToNote(midi) {
  const rounded = Math.round(midi)
  return `${NOTE_NAMES[((rounded % 12) + 12) % 12]}${Math.floor(rounded / 12) - 1}`
}

export function quantize(value, scaleName = 'major', rootMidi = 50, octaves = 2) {
  const scale = SCALES[scaleName] || SCALES.major
  const v = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0.5))
  const degreeCount = scale.length * octaves
  const index = Math.round(v * (degreeCount - 1))
  const octave = Math.floor(index / scale.length)
  const degree = scale[index % scale.length]
  return rootMidi + octave * 12 + degree
}

export function chordFor(scaleName, rootMidi, degree = 0) {
  const scale = SCALES[scaleName] || SCALES.major
  return [0, 2, 4].map((step) => {
    const idx = degree + step
    const octave = Math.floor(idx / scale.length)
    return rootMidi + octave * 12 + scale[idx % scale.length]
  })
}

export const SCALE_LABELS = {
  auto: 'Auto (track-led)',
  major: 'Major — open',
  minor: 'Minor — shaded',
  dorian: 'Dorian — bittersweet',
  phrygian: 'Phrygian — tense',
  majorPentatonic: 'Pentatonic — clear',
  minorPentatonic: 'Minor pentatonic — deep',
}
