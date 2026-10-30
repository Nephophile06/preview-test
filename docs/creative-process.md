# Creative process

Earth Jukebox began with a simple provocation: a climate dashboard tells you what the planet is doing; an instrument lets you feel it. The goal was not to add background music to a map. It was to make the data itself audible, with every parameter traceable to something on screen or in the series.

## The constraints shaped the work

The brief set four hard edges:

1. **Accessibility is the default.** Blind and low-vision listeners must be able to choose a dataset, move through time, inspect a place and understand what changed — using only a keyboard and sound.
2. **The demo must work offline.** NASA services cannot be the single point of failure in a live presentation. Every frame, series and hotspot needs a local copy.
3. **The initial bundle must stay under 250 KB gzip.** Tone.js and heavy data must load only when needed.
4. **No API keys in the repository.** Live FIRMS is optional and read from `.env`.

Those constraints pushed us away from a conventional map application. If the interface has to be legible to a screen reader and usable with four keys, it should not be a dense dashboard. It should be a small, calm control surface around one large piece of evidence: the Earth.

## Visual language

The palette was fixed — `#121313`, `#f9eed8`, `#3f75bb`, `#739a69` — and it set the tone. We treated it as an editorial print system rather than a product theme:

- near-black ink as the room, cream as paper and type, blue and leaf as data accents, with rust reserved for heat and fire;
- one sans-serif family, small uppercase labels, generous letter spacing, thin rules;
- glass only where controls float over the map, never as a decorative card wall;
- map colour ramps derived from the same palette, so the four tracks feel like four inks on the same press.

We deliberately avoided neon gradients, glowing borders and dashboard chrome. The app should feel like an atlas with a listening room attached.

The map itself is an equirectangular canvas with a Blue Marble relief. GIBS frames are re-coloured by ranking official colormap pixels, not by inventing values. The rank controls relative signal; the palette controls mood. Data stays legible over the relief because opacity rises with signal strength.

## Turning sight into sound

The first prototype sonified the cursor position only. It was expressive but not explanatory: moving the mouse changed the music, yet the music did not tell you anything about the month or the field. We rebuilt the mapping around the frame.

Every frame is analysed on a 64 × 36 grid:

- **hue** becomes pitch, quantised to a track scale;
- **brightness** opens the filter and sets presence;
- **density** sets notes per bar and percussion force;
- **edges and variance** add texture, detune and reverb;
- **latitude and longitude** set register and stereo position;
- **the probe's anomaly** chooses harmony — minor for heat or loss, major for balance or recovery.

The pure function `mapFeaturesToAudio` returns a bounded parameter object. That decision paid off twice: it made the mapping unit-testable, and it made the audio engine safe. No parameter can produce a value that clips, stalls or explodes.

Each track has a distinct identity:

- **Temperature** is slow and harmonic: a wide sine pad, a sparse FM arpeggio, Dorian by default. Warm anomalies pull it minor. The arpeggio is the "thermometer" you can follow without looking.
- **Fires** is percussive: pink-noise crackle, membrane impacts, a dry ember tick and a low air bed. Density is heard as rhythm before it is understood as count.
- **Vegetation** is a marimba-like pentatonic pattern with a soft bass and shaker texture. Greenness opens the filter; brown ground leaves space.
- **Water** is drone-led: two detuned sines, a slow filter sweep and wide polyphonic ripples. Storage surplus sounds open; deficit pulls the bass down.

The probe series adds a two-bar melodic phrase built from the eight values around the current date. You are not hearing a generic loop; you are hearing the shape of the local time series.

## Accessibility as composition

Accessibility changed the music, not just the markup.

- Because the map is a keyboard instrument, the probe moves in 5° steps and announces its coordinates and value. The same probe drives the audio, so keyboard and pointer users hear the same thing.
- Because descriptions are spoken, the Now Playing copy had to be short and factual, not poetic filler. "87, dense thermal activity, +20 versus the monthly mean" is more useful than "a wall of fire."
- Because audio must not surprise, playback starts only after a gesture, at 60%, through a compressor and limiter, with ramps on every parameter.
- Because reduced motion is a real preference, camera moves and pulsing cues have static equivalents. The story chapters still advance; the map simply cuts rather than glides.
- Because screen-reader users cannot see a focus ring, panels trap focus, return it on close, and every control has a name. `Escape` is a universal exit.

The map's `role="application"` is a deliberate choice: it lets arrow keys belong to the map while it has focus, with instructions in the accessible name. Outside the map, arrow keys return to normal browser behaviour.

## Engineering decisions that shaped the feel

**Offline first, live second.** The frontend asks the backend first, then falls back to bundled JSON. The backend asks NASA first (for temperature), then falls back to prepared cache. Both layers have short timeouts. In a demo room with bad Wi-Fi, the instrument still opens, still probes, still plays.

**Lazy audio.** Tone.js is a separate chunk loaded on the first play gesture. The initial app remains under 100 KB gzip. The map and controls render before the audio engine exists.

**Prepared, not scraped at runtime.** `scripts/prepare_data.py` downloads GIBS frames and POWER data, writes WebP frames, grids and hotspots, and records source URLs in a manifest. The demo can be rebuilt from NASA sources without hand-editing data.

**One mapping, four racks.** The tracks share a scheduler and master chain but have separate voice racks and gated buses. Switching tracks disposes the old rack and creates the new one. That keeps CPU low and prevents a previous track's reverb tail from leaking into the next.

## What broke, and what we changed

Several failures were instructive:

- **Invalid live dates.** POWER returned an annual `2025-13-01` key, which crashed date formatting and blanked the screen on probe. We filtered month keys at the API boundary and guarded date formatting in the UI. Live data is now treated as untrusted input.
- **Note-name concatenation.** A sparkle transposition produced `C412` instead of adding an octave to the MIDI value. The fix was to keep transposition in MIDI until the final conversion.
- **Same-time collisions.** A monophonic synth triggered twice at the same transport time threw a scheduling error. Sparkles moved to non-conflicting bars; the water ripple became a polyphonic voice.
- **Filter LFO override.** Ramping a filter frequency that an LFO already controlled scheduled a zero. For water, we now move the LFO's min/max instead.
- **MetalSynth retrigger.** The fires ember tick used a `MetalSynth`, which cannot retrigger safely in Tone 15 and threw during playback. It is now a short square blip through the track's high-pass filter.
- **Scale mismatch.** Fires grids were 0–1 while the copy and formatter expected 0–100, so dense fire read as "almost no thermal signal." The grid is now a 0–100 heat index.
- **Narrative mismatch.** The water story originally described a drought at places whose derived values were positive. We rewrote the chapters around Amazon deficit/surplus, inland Australia and the Congo, and moved the default listening point to the Congo Basin.

## Data honesty

The most important editorial decision was to separate **measured** from **derived** values in the copy:

- Temperature series are NASA POWER air temperature at 2 m; frames are MODIS land-surface temperature. We say so.
- Fire, vegetation and water series are palette-derived ranks from official GIBS imagery, calibrated to plausible ranges. They are useful for relative change and sonification, not for quoting physical values.
- Water is GRACE liquid water equivalent thickness for 2021–2022. It is not groundwater, not soil moisture and not current. The README, help drawer and track copy all state this.

The instrument is more trustworthy when it admits what it is.

## If we had another week

- Replace palette-derived series with direct science retrievals (MODIS NDVI, GRACE mascons, FIRMS FRP) and keep the palette only for presentation.
- Add a true A/B comparison between two dates with a crossfade, rather than the current compare index.
- Record a narrated version of the guided story with a human voice, with the synthetic voice as fallback.
- Add a printable/exportable "listening score" that maps the current frame to a short score or data sheet.
- Test with blind musicians and low-vision users in a structured session, especially the density of live-region announcements during playback.

The current build is a complete, offline-capable instrument. The next version should be a scientific one.
