import { midiToNote, quantize } from './scales'

function safeDispose(node) {
  try {
    node?.dispose?.()
  } catch {
    // already disposed
  }
}

class VoiceRack {
  constructor(Tone, master, track) {
    this.Tone = Tone
    this.track = track
    this.nodes = []
    this.step = 0
    this.bus = new Tone.Gain(0).connect(master)
    this.reverb = new Tone.Freeverb({ roomSize: 0.58, dampening: 3400, wet: 0.2 }).connect(this.bus)
    this.panner = new Tone.Panner(0).connect(this.reverb)
    this.filter = new Tone.Filter({ frequency: 1800, type: track.id === 'fires' ? 'highpass' : 'lowpass', rolloff: -24 }).connect(this.panner)
    this.nodes.push(this.bus, this.reverb, this.panner, this.filter)
    this.build()
  }

  trackNode(node) {
    this.nodes.push(node)
    return node
  }

  build() {
    const { Tone } = this
    const id = this.track.id
    if (id === 'temperature') {
      this.pad = this.trackNode(
        new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 6,
          oscillator: { type: 'sine' },
          envelope: { attack: 2.6, decay: 1.8, sustain: 0.5, release: 5 },
          volume: -20,
        }).connect(this.filter),
      )
      this.arp = this.trackNode(
        new Tone.FMSynth({
          harmonicity: 2.01,
          modulationIndex: 3.5,
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.02, decay: 0.4, sustain: 0.06, release: 1.6 },
          modulation: { type: 'sine' },
          modulationEnvelope: { attack: 0.05, decay: 0.3, sustain: 0, release: 0.2 },
          volume: -20,
        }).connect(this.filter),
      )
    } else if (id === 'fires') {
      this.crackle = this.trackNode(
        new Tone.NoiseSynth({
          noise: { type: 'pink' },
          envelope: { attack: 0.002, decay: 0.07, sustain: 0, release: 0.04 },
          volume: -28,
        }).connect(this.filter),
      )
      this.impact = this.trackNode(
        new Tone.MembraneSynth({
          pitchDecay: 0.008,
          octaves: 3,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.12 },
          volume: -25,
        }).connect(this.filter),
      )
      // MetalSynth cannot safely retrigger in Tone 15, so the ember tick is a
      // short square blip through the track's high-pass filter.
      this.click = this.trackNode(
        new Tone.Synth({
          oscillator: { type: 'square' },
          envelope: { attack: 0.001, decay: 0.055, sustain: 0, release: 0.02 },
          volume: -34,
        }).connect(this.filter),
      )
      this.air = this.trackNode(
        new Tone.NoiseSynth({
          noise: { type: 'brown' },
          envelope: { attack: 0.4, decay: 1.2, sustain: 0.02, release: 0.8 },
          volume: -38,
        }).connect(this.filter),
      )
    } else if (id === 'vegetation') {
      this.pluck = this.trackNode(
        new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 8,
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.008, decay: 0.42, sustain: 0.04, release: 0.8 },
          volume: -19,
        }).connect(this.filter),
      )
      this.bass = this.trackNode(
        new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.6, decay: 0.8, sustain: 0.15, release: 2.2 },
          volume: -25,
        }).connect(this.filter),
      )
      this.shaker = this.trackNode(
        new Tone.NoiseSynth({
          noise: { type: 'pink' },
          envelope: { attack: 0.004, decay: 0.04, sustain: 0, release: 0.04 },
          volume: -40,
        }).connect(this.filter),
      )
    } else {
      this.droneA = this.trackNode(
        new Tone.Oscillator({ frequency: 55, type: 'sine', volume: -25 }).connect(this.filter),
      )
      this.droneB = this.trackNode(
        new Tone.Oscillator({ frequency: 82.41, type: 'sine', volume: -29 }).connect(this.filter),
      )
      this.droneA.start()
      this.droneB.start()
      this.ripple = this.trackNode(
        new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 4,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.4, decay: 1.6, sustain: 0.08, release: 2.6 },
          volume: -23,
        }).connect(this.filter),
      )
      this.filterLfo = this.trackNode(new Tone.LFO(0.07, 420, 1600).start())
      this.filterLfo.connect(this.filter.frequency)
    }
  }

  gate(open) {
    this.bus.gain.rampTo(open ? 1 : 0, 0.22)
  }

  update(params) {
    const filterMax = this.track.id === 'fires' ? 5200 : 3400
    if (this.track.id === 'water') {
      // The LFO overrides the filter frequency; moving the LFO range is safe.
      this.filterLfo.min = Math.max(80, params.filter * 0.55)
      this.filterLfo.max = Math.min(filterMax, params.filter * 1.2)
    } else {
      this.filter.frequency.rampTo(Math.min(filterMax, params.filter), 0.18)
    }
    this.panner.pan.rampTo(params.pan, 0.2)
    this.reverb.wet.rampTo(params.reverb, 0.25)
    if (this.track.id === 'water') {
      const root = params.bassMidi
      const freq = 440 * 2 ** ((root - 69) / 12)
      this.droneA.frequency.rampTo(freq, 0.6)
      this.droneB.frequency.rampTo(freq * 1.4983, 0.8)
      this.filterLfo.frequency.rampTo(0.05 + params.rhythm * 0.09, 0.4)
    }
    if (this.track.id === 'temperature') {
      this.pad.volume.rampTo(-20 + params.brightness * 3, 0.25)
    }
  }

  pulse(step) {
    // deterministic, gently uneven pattern — no new object allocation
    return Math.abs(Math.sin((step + 1) * 12.9898) * 43758.5453) % 1
  }

  trigger(step, time, params, phrase) {
    this.step = step
    const noteAt = (offset = 0, octave = 0) => midiToNote(quantize(
      phrase[(step + offset) % phrase.length] ?? 0.5,
      params.scale,
      params.leadMidi - 12,
      2,
    ) + octave * 12)
    const bar = step % 16

    if (this.track.id === 'temperature') {
      if (bar === 0) {
        const chord = params.chord.map((m) => midiToNote(m))
        this.pad.triggerAttackRelease(chord, '2m', time, 0.52)
      }
      if (bar % 2 === 0) {
        const probability = 0.45 + params.rhythm * 0.42
        if (this.pulse(step) < probability) {
          this.arp.triggerAttackRelease(noteAt(1), '8n', time, 0.38 + params.density * 0.2)
        }
      }
      if (bar === 9) {
        this.arp.triggerAttackRelease(noteAt(4, 1), '16n', time, 0.18)
      }
    } else if (this.track.id === 'fires') {
      const heat = params.density
      if (bar % 2 === 0 && this.pulse(step) < 0.3 + params.rhythm * 0.7) {
        this.crackle.triggerAttackRelease('32n', time, 0.42 + heat * 0.4)
      }
      if ((bar === 0 || bar === 7 || bar === 11) && heat > 0.12) {
        this.impact.triggerAttackRelease(midiToNote(params.bassMidi - 12), '16n', time, 0.38 + heat * 0.35)
      }
      if (this.pulse(step + 5) < heat * 0.8) {
        this.click.triggerAttackRelease(midiToNote(params.leadMidi + 24), '64n', time, 0.24)
      }
      if (bar === 0) this.air.triggerAttackRelease('1m', time, 0.16 + heat * 0.2)
    } else if (this.track.id === 'vegetation') {
      if (bar % 2 === 0 && this.pulse(step) < 0.38 + params.rhythm * 0.55) {
        const n = noteAt(bar % 6)
        this.pluck.triggerAttackRelease([n, noteAt((bar % 6) + 2)], '16n', time, 0.3 + params.brightness * 0.22)
      }
      if (bar === 0) {
        this.bass.triggerAttackRelease(midiToNote(params.bassMidi - 12), '2n', time, 0.38)
      }
      if (this.pulse(step + 9) < params.texture * 0.55) {
        this.shaker.triggerAttackRelease('64n', time, 0.2)
      }
    } else {
      if (bar % 4 === 0) {
        this.ripple.triggerAttackRelease(noteAt(bar % 8), '8n', time, 0.36 + params.brightness * 0.18)
      }
      if (bar === 6) {
        this.ripple.triggerAttackRelease(noteAt(3, 1), '16n', time, 0.16)
      }
    }
  }

  dispose() {
    for (const node of this.nodes) safeDispose(node)
    this.nodes = []
  }
}

export function createVoices(Tone, master, track) {
  return new VoiceRack(Tone, master, track)
}
