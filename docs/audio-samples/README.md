# Audio samples

Four 18-second clips, recorded from the live Earth Jukebox audio engine — not rendered from a separate mock-up. Each clip is the actual voice rack, mapping and master chain for the scene named in the filename.

| File | Track | Scene | What you hear |
| --- | --- | --- | --- |
| `01-temperature-seville-july.wav` | Temperature | Seville, 2025-07 | Sine pad, FM arpeggio, Dorian harmony; high, bright summer frame |
| `02-fires-angola-october.wav` | Fires | Angola highlands, 2025-10 | Dense pink-noise crackle, membrane impacts, ember ticks, dry air |
| `03-vegetation-amazon-july.wav` | Vegetation | Central Amazon, 2024-07 | Pentatonic marimba plucks, soft bass, leaf-like shaker |
| `04-water-congo-march.wav` | Water | Congo Basin, 2022-03 | Detuned drones, slow filter sweep, wide polyphonic ripples |

## Capture details

- Rendered in headless Chromium from the real app at `frontend/src/audio/engine.js`, using the same frame analysis and probe series as the UI.
- Recorded with `MediaRecorder` from the limiter output, then decoded and written as 44.1 kHz, 16-bit stereo WAV, normalised to −1 dBFS.
- Duration: approximately 18 seconds each.
- The scene features and parameters are listed in the render log, for example: Temperature — 92 BPM, Dorian, filter 2575 Hz, brightness 0.66, density 0.79, lead MIDI 80.

These are documentation assets. They are not loaded by the app. The in-app export creates a 20-second WebM postcard using the same code path.

## Re-recording

The dev-only renderer is `frontend/dev/render-samples.js`. With the Vite dev server running, import `/dev/render-samples.js` in the browser and call `renderSamples()`; it returns base64 WAV data for the four scenes. For headless capture, launch Chromium with `--autoplay-policy=no-user-gesture-required` so the engine can start without a gesture.

Data: NASA GIBS and NASA POWER. Palette-derived indices for fire, vegetation and water; see the provenance table in the repository README.
