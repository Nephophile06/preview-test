import { useStore } from '../app/store'
import { trackForId } from '../data/tracks'
import { Drawer } from './Drawer'
import { KeyboardIcon } from './Icons'

export function HelpDrawer() {
  const closePanels = useStore((s) => s.closePanels)
  const trackId = useStore((s) => s.trackId)
  const track = trackForId(trackId)

  return (
    <Drawer title="How to hear the Earth" eyebrow="Field guide · 2 min" onClose={closePanels}>
      <p className="drawer-lede">
        Earth Jukebox turns NASA satellite imagery and climate data into music. Colour becomes pitch, brightness becomes tone,
        density becomes rhythm. Nothing here is a soundtrack: every note is tied to what the map is showing.
      </p>

      <div className="drawer-section">
        <h3>How the sound is built</h3>
        <table className="sound-table">
          <tbody>
            <tr><td>Hue / colour</td><td>Pitch, quantised to a musical scale. Blue sits low; cream and rust climb.</td></tr>
            <tr><td>Brightness / value</td><td>Volume and filter opening. Brighter data sounds more present.</td></tr>
            <tr><td>Dense hot pixels</td><td>Notes per bar and percussion force. More signal, faster rhythm.</td></tr>
            <tr><td>Contrast / edges</td><td>Texture: reverb, detune and a dry noise layer.</td></tr>
            <tr><td>Place on Earth</td><td>Stereo position and register. High latitudes sound lower and wider.</td></tr>
            <tr><td>Data anomaly</td><td>Harmony. Warmth and loss lean minor; recovery and balance open major.</td></tr>
          </tbody>
        </table>
      </div>

      <div className="drawer-section">
        <h3>{track.title} · this track</h3>
        <p className="a11y-note">{track.mapping}</p>
      </div>

      <div className="drawer-section">
        <h3><KeyboardIcon size={13} /> Keyboard</h3>
        <div className="shortcut-list">
          <kbd>Space</kbd><span>Play or pause</span>
          <kbd>← →</kbd><span>Move one frame / date</span>
          <kbd>↑ ↓</kbd><span>Volume up / down</span>
          <kbd>1–4</kbd><span>Choose a track</span>
          <kbd>P</kbd><span>Open or close the probe</span>
          <kbd>E</kbd><span>Explore with the cursor</span>
          <kbd>M</kbd><span>Mute</span>
          <kbd>S</kbd><span>Start guided story</span>
          <kbd>?</kbd><span>This guide</span>
          <kbd>Esc</kbd><span>Close panels</span>
        </div>
      </div>

      <div className="drawer-section">
        <h3>Listening access</h3>
        <p className="a11y-note">
          Every sound state has a visible and screen-reader description. On the map, arrow keys move the probe in 5° steps;
          hold Shift for 15°. Turn on spoken descriptions in Settings, or use high contrast and reduced motion. Audio starts at
          60% with a soft limiter, and only after you press play.
        </p>
      </div>

      <div className="drawer-section">
        <h3>Data</h3>
        <p className="a11y-note">
          Imagery: NASA GIBS. Temperature series: NASA POWER / MERRA-2. Every frame and series has a local NASA cache, so the
          installation can run without a network. Palette-derived indices for fire, vegetation and water are documented in the
          README.
        </p>
      </div>
    </Drawer>
  )
}
