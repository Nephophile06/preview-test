import { useStore } from '../app/store'
import { SCALE_LABELS } from '../audio/scales'
import { trackForId } from '../data/tracks'
import { Drawer } from './Drawer'
import { ContrastIcon, DownloadIcon, MotionIcon, ShareIcon } from './Icons'

function Toggle({ title, desc, checked, onChange }) {
  return (
    <div className="toggle-row">
      <div className="toggle-copy">
        <div className="toggle-title">{title}</div>
        {desc && <div className="toggle-desc">{desc}</div>}
      </div>
      <button className="switch" role="switch" aria-checked={checked} aria-label={title} onClick={() => onChange(!checked)} />
    </div>
  )
}

export function SettingsDrawer({ onExport, onShare }) {
  const closePanels = useStore((s) => s.closePanels)
  const settings = useStore((s) => s.settings)
  const setSetting = useStore((s) => s.setSetting)
  const volume = useStore((s) => s.volume)
  const setVolume = useStore((s) => s.setVolume)
  const muted = useStore((s) => s.muted)
  const toggleMute = useStore((s) => s.toggleMute)
  const exportState = useStore((s) => s.exportState)
  const announce = useStore((s) => s.announceText)
  const showToast = useStore((s) => s.showToast)
  const setOnboardingStep = useStore((s) => s.setOnboardingStep)
  const track = trackForId(useStore((s) => s.trackId))

  const set = (key, value) => {
    setSetting(key, value)
    if (key === 'speech') announce(value ? 'Spoken descriptions on.' : 'Spoken descriptions off.')
    if (key !== 'speech') showToast('Preference saved.')
  }

  return (
    <Drawer title="Listening room" eyebrow="Settings" onClose={closePanels}>
      <p className="drawer-lede">
        Shape the instrument. Changes are saved on this device and every parameter is ramped smoothly.
      </p>

      <div className="drawer-section">
        <h3>Voice</h3>
        <div className="field">
          <div className="field-head">
            <label className="field-label" htmlFor="scale-select">Scale</label>
            <span className="field-output">{settings.scaleMode === 'auto' ? track.scale : ''}</span>
          </div>
          <select
            id="scale-select"
            className="select"
            value={settings.scaleMode}
            onChange={(event) => set('scaleMode', event.target.value)}
          >
            <option value="auto">{SCALE_LABELS.auto}</option>
            <option value="major">{SCALE_LABELS.major}</option>
            <option value="minor">{SCALE_LABELS.minor}</option>
            <option value="dorian">{SCALE_LABELS.dorian}</option>
            <option value="phrygian">{SCALE_LABELS.phrygian}</option>
            <option value="majorPentatonic">{SCALE_LABELS.majorPentatonic}</option>
            <option value="minorPentatonic">{SCALE_LABELS.minorPentatonic}</option>
          </select>
          <span className="field-hint">“Auto” follows the track and the data anomaly. Pentatonic is the gentlest choice.</span>
        </div>

        <div className="field">
          <div className="field-head">
            <span className="field-label">Sound intensity</span>
            <span className="field-output">{Math.round(settings.intensity * 100)}%</span>
          </div>
          <input
            type="range"
            className="range"
            min="0.4"
            max="1.3"
            step="0.05"
            value={settings.intensity}
            style={{ '--progress': `${((settings.intensity - 0.4) / 0.9) * 100}%`, '--accent': track.accent }}
            onChange={(event) => set('intensity', Number(event.target.value))}
            aria-label="Sound intensity"
          />
          <span className="field-hint">Controls modulation depth and note force; the master limiter stays fixed.</span>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <div className="field-head">
            <span className="field-label">Volume</span>
            <span className="field-output">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            className="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            style={{ '--progress': `${volume * 100}%`, '--accent': track.accent }}
            onChange={(event) => setVolume(Number(event.target.value))}
            aria-label="Volume"
          />
          <span className="field-hint">The output is limited at −2 dB. Default volume is 60%.</span>
        </div>
        <Toggle
          title="Mute output"
          desc="Silences the instrument without losing your place."
          checked={muted}
          onChange={() => toggleMute()}
        />
      </div>

      <div className="drawer-section">
        <h3>Descriptions & access</h3>
        <Toggle
          title="Spoken descriptions"
          desc="Read probe and Now Playing descriptions aloud using your system voice."
          checked={settings.speech}
          onChange={(v) => set('speech', v)}
        />
        <Toggle
          title="High contrast"
          desc="Opaque panels, brighter rules and stronger focus."
          checked={settings.highContrast}
          onChange={(v) => set('highContrast', v)}
        />
        <Toggle
          title="Reduce motion"
          desc="Removes pulses, transitions and animated shimmer."
          checked={settings.reduceMotion}
          onChange={(v) => set('reduceMotion', v)}
        />
        <Toggle
          title="Haptic pulse"
          desc={navigator.vibrate ? 'Rhythm-synced vibration on supported phones.' : 'Not supported by this browser.'}
          checked={settings.haptics}
          onChange={(v) => set('haptics', v)}
        />
      </div>

      <div className="drawer-section">
        <h3>Take it with you</h3>
        <div className="export-row">
          <div>
            <div className="toggle-title">Twenty-second postcard</div>
            <div className="toggle-desc">Records the live mix, including the current place.</div>
          </div>
          <button className="button" onClick={onExport} disabled={exportState === 'recording'}>
            <DownloadIcon />
            {exportState === 'recording' ? 'Recording…' : 'Export'}
          </button>
        </div>
        <div className="settings-actions">
          <button className="button" onClick={onShare}>
            <ShareIcon />
            Copy link
          </button>
          <button
            className="button"
            onClick={() => {
              closePanels()
              setOnboardingStep(0)
            }}
          >
            Replay intro
          </button>
        </div>
      </div>

      <div className="drawer-section">
        <h3>A note on the visuals</h3>
        <p className="a11y-note">
          <ContrastIcon size={12} /> The map palette is an editorial duotone over official NASA colormaps; the underlying
          spatial pattern is unchanged. <MotionIcon size={12} /> Motion is limited to short fades and panel slides.
        </p>
      </div>
    </Drawer>
  )
}
