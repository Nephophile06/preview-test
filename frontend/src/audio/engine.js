import { createVoices } from './voices'

const audio = {
  Tone: null,
  ready: false,
  starting: null,
  master: null,
  compressor: null,
  limiter: null,
  analyser: null,
  voices: null,
  track: null,
  params: null,
  phrase: [0.5],
  scheduler: null,
  step: 0,
  volume: 0.6,
  muted: false,
  exploreSynth: null,
  explorePanner: null,
  exploreReverb: null,
  lastExplore: 0,
}

const VOLUME_HEADROOM = 0.52

function volumeToGain(volume) {
  return Math.max(0, Math.min(1, volume)) ** 1.6 * VOLUME_HEADROOM
}

async function enable() {
  if (audio.ready) return audio
  if (audio.starting) return audio.starting
  audio.starting = (async () => {
    const Tone = await import('tone')
    await Tone.start()
    audio.Tone = Tone
    audio.master = new Tone.Gain(volumeToGain(audio.volume)).toDestination()
    audio.compressor = new Tone.Compressor({ threshold: -20, ratio: 3.5, attack: 0.02, release: 0.25 }).connect(audio.master)
    audio.limiter = new Tone.Limiter(-2).connect(audio.compressor)
    audio.analyser = new Tone.Analyser('waveform', 128)
    audio.limiter.connect(audio.analyser)

    audio.explorePanner = new Tone.Panner(0).connect(audio.master)
    audio.exploreReverb = new Tone.Freeverb({ roomSize: 0.72, dampening: 2600, wet: 0.34 }).connect(audio.explorePanner)
    audio.exploreSynth = new Tone.FMSynth({
      harmonicity: 2,
      modulationIndex: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.008, decay: 0.35, sustain: 0.04, release: 0.9 },
      modulationEnvelope: { attack: 0.02, decay: 0.2, sustain: 0, release: 0.2 },
      volume: -24,
    }).connect(audio.exploreReverb)

    const transport = Tone.getTransport()
    transport.bpm.value = 70
    audio.scheduler = transport.scheduleRepeat((time) => {
      if (!audio.voices || !audio.params) return
      audio.step = (audio.step + 1) % 16
      audio.voices.trigger(audio.step, time, audio.params, audio.phrase)
    }, '16n')
    audio.ready = true
    audio.starting = null
    return audio
  })().catch((error) => {
    audio.starting = null
    throw error
  })
  return audio.starting
}

export async function primeAudio() {
  try {
    await enable()
    return true
  } catch {
    return false
  }
}

function ensureVoices(track) {
  if (!track) return
  if (audio.track?.id === track.id && audio.voices) return
  if (audio.voices) audio.voices.dispose()
  audio.voices = createVoices(audio.Tone, audio.limiter, track)
  audio.track = track
  audio.voices.gate(false)
}

export async function start(track, params, phrase, volume = audio.volume, muted = false) {
  await enable()
  const Tone = audio.Tone
  audio.volume = volume
  audio.muted = muted
  audio.params = params
  audio.phrase = phrase?.length ? phrase : [0.5]
  ensureVoices(track)
  audio.voices.update(params)
  audio.voices.gate(!muted)
  audio.master.gain.rampTo(muted ? 0 : volumeToGain(volume), 0.25)
  Tone.getTransport().bpm.rampTo(params.tempo, 0.4)
  if (Tone.getTransport().state !== 'started') {
    Tone.getTransport().start('+0.06')
  }
  return true
}

export function pause() {
  if (!audio.ready) return
  audio.voices?.gate(false)
  audio.Tone.getTransport().pause()
}

export function update({ track, params, phrase, volume, muted }) {
  if (!audio.ready) return
  audio.volume = volume ?? audio.volume
  audio.muted = muted ?? audio.muted
  if (track) ensureVoices(track)
  if (params) {
    audio.params = params
    audio.voices?.update(params)
    audio.Tone.getTransport().bpm.rampTo(params.tempo, 0.5)
  }
  if (phrase?.length) audio.phrase = phrase
  audio.voices?.gate(audio.Tone.getTransport().state === 'started' && !audio.muted)
  audio.master.gain.rampTo(audio.muted ? 0 : volumeToGain(audio.volume), 0.16)
}

export function stop() {
  if (!audio.ready) return
  audio.voices?.gate(false)
  audio.Tone.getTransport().pause()
}

export function dispose() {
  if (!audio.ready) return
  try {
    audio.Tone.getTransport().clear(audio.scheduler)
    audio.voices?.dispose()
    audio.exploreSynth?.dispose()
    audio.exploreReverb?.dispose()
    audio.explorePanner?.dispose()
    audio.analyser?.dispose()
    audio.limiter?.dispose()
    audio.compressor?.dispose()
    audio.master?.dispose()
  } finally {
    audio.ready = false
    audio.voices = null
    audio.track = null
  }
}

export function explore({ midi, pan = 0, velocity = 0.25, oscillator }) {
  if (!audio.ready) return
  const now = audio.Tone.now()
  if (now - audio.lastExplore < 0.085) return
  audio.lastExplore = now
  if (oscillator && audio.exploreSynth.oscillator.type !== oscillator) {
    audio.exploreSynth.oscillator.type = oscillator
  }
  audio.explorePanner.pan.rampTo(pan, 0.07)
  audio.exploreSynth.triggerAttackRelease(midi, '16n', now, Math.min(0.7, Math.max(0.08, velocity)))
}

export function waveform(target) {
  if (!audio.ready || !audio.analyser) {
    target?.fill?.(0)
    return 0
  }
  const values = audio.analyser.getValue()
  if (target?.length) {
    for (let i = 0; i < target.length; i += 1) {
      target[i] = values[Math.floor((i / target.length) * values.length)] || 0
    }
  }
  let sum = 0
  for (let i = 0; i < values.length; i += 1) sum += values[i] * values[i]
  return Math.sqrt(sum / values.length)
}

export async function recordClip(seconds = 20) {
  if (!audio.ready) throw new Error('Start the jukebox before exporting.')
  const raw = audio.Tone.getContext().rawContext
  if (typeof MediaRecorder === 'undefined' || !raw.createMediaStreamDestination) {
    throw new Error('Audio recording is not supported in this browser.')
  }
  const destination = raw.createMediaStreamDestination()
  audio.limiter.connect(destination)
  const chunks = []
  const recorder = new MediaRecorder(destination.stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '' })
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data)
  }
  const done = new Promise((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
    recorder.onerror = () => reject(new Error('Recording failed.'))
  })
  recorder.start()
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000))
  recorder.stop()
  const blob = await done
  try {
    audio.limiter.disconnect(destination)
  } catch {
    // already disconnected
  }
  return blob
}

export function getAudioState() {
  return { ready: audio.ready, playing: audio.Tone?.getTransport().state === 'started', level: waveform() }
}
