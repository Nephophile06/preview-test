# Three-minute demo script

A live walkthrough for judges, a screen recording or a stage. Times are cumulative. The spoken lines are a guide, not a script to read robotically.

## Before you start (2 minutes)

1. Start the backend and frontend (`README.md`, Quick start).
2. Open `http://127.0.0.1:5173` in Chrome or Firefox at 1440 × 900.
3. Confirm the badge reads `LIVE NASA` or `CACHED NASA`.
4. Click **Play** once, set volume to a comfortable level, then pause. This unlocks audio.
5. Have headphones ready. If you are presenting to a room, use the exported audio clip as a backup.
6. Optional offline proof: stop the backend, reload, and confirm the badge reads `LOCAL` and the map still works.

## 0:00–0:20 — The idea

**On screen:** the default Temperature view, paused, Seville probe visible.

**Say:** "This is Earth Jukebox. It turns NASA satellite data into an instrument. You are looking at one month of land-surface temperature. Every colour you see is also a note you can hear. The app is fully keyboard-operable and designed for blind listeners first, not as an afterthought."

## 0:20–0:45 — Start listening

**Do:** press **Space** (or click Play). Wait for the pad to settle.

**Say:** "The pad is the background climate. The arpeggio follows the data. Right now we are in July, so the map is warm and the melody is high. January would sound lower and sparser."

**Do:** press **←** three times to move back toward spring. Let the phrase change.

**Say:** "Moving through time changes the phrase, not just the picture. The probe reads the local series, so the melody is the shape of this place over the year."

## 0:45–1:15 — Probe a place

**Do:** click Seville (or focus the map, use arrow keys, press **Enter**). The probe panel opens with value, anomaly and sparkline.

**Say:** "At this point, 10.4 degrees, about 1.3 degrees warmer than the 2016–24 average. The sparkline shows the year. The anomaly is why the harmony leans minor: heat is not just a number here, it is a change in tension."

**Do:** press **Escape** to close the panel, then press **S** to start the guided story.

**Say:** "The guided story takes four chapters per track. The camera moves, the data changes, and the same mapping keeps playing."

Let the first chapter run for about 9 seconds, then press **Escape** to stop.

## 1:15–1:50 — Two more tracks

**Do:** press **2** for Fires. Wait four seconds.

**Say:** "Fires is percussion. Each thermal anomaly is a fleck; density becomes rhythm. This is not a drum loop — the pattern is driven by where the satellite actually saw heat. The dry crackle is the edges of the fire field."

**Do:** press **3** for Vegetation. Wait four seconds.

**Say:** "Vegetation is pentatonic and gentler. Green ground opens the filter and fills the pattern; brown ground leaves space. You can hear the difference between the Amazon and the Sahel without reading a legend."

**Do:** press **4** for Water.

**Say:** "Water is drone-led. GRACE measures how much water is stored on land and underground. A surplus sounds open; a deficit pulls the bass down. This is a 2021–22 record, not a current drought map — the app says so in the panel."

## 1:50–2:20 — Accessibility

**Do:** press **M** to mute, then **M** again. Press **?** to open the field guide.

**Say:** "Every control has a keyboard route: 1 to 4 for tracks, arrows for time and volume, P for probe, E for explore, M for mute, S for story, question mark for this guide. The map itself is an application region: arrow keys move the listening probe in five-degree steps and announce coordinates and values. Screen readers get live announcements for track, frame, probe and story changes."

**Do:** scroll the guide to show the sound-mapping table, then close with **Escape**.

**Say:** "Settings includes spoken descriptions, high contrast and reduced motion. Audio only starts after a gesture, at 60 percent, through a limiter. Nothing here will surprise a listener with a sudden loud start."

## 2:20–2:45 — Offline proof

**Do:** stop the backend in a terminal (or switch off Wi-Fi), reload the page. Badge changes to `LOCAL`.

**Say:** "Every frame, series and hotspot has a local NASA cache. The demo works with no network. When NASA is reachable, the same app prefers live POWER data and optional FIRMS hotspots. The badge tells you which layer you are hearing."

**Do:** click the map and open the probe; show that the sparkline still renders.

## 2:45–3:00 — Close

**Do:** press **4**, press **Space**, let the water drone play under the closing line.

**Say:** "Earth Jukebox is a way to listen to the planet, not just look at it. It is offline-capable, keyboard-first and honest about what the data can and cannot say. The code, the NASA cache and four recorded clips are in the repository."

## Fallbacks

- **No audio in the room:** play `docs/audio-samples/01-temperature-seville-july.wav` and describe the mapping. All four clips are 18 seconds.
- **No backend:** nothing changes; the frontend falls back to `frontend/public/data/` and `frontend/public/frames/`.
- **No network at all:** the same fallback applies. Do not run `scripts/prepare_data.py` on stage.
- **Projector washes out the map:** switch on high contrast in Settings. The panels become opaque and the rules stronger.
- **A judge asks about the data:** use the provenance table in `README.md`. Be explicit that fire, vegetation and water series are palette-derived relative indices; temperature is NASA POWER air temperature; water is GRACE 2021–22.

## Cue sheet

| Time | Action | Shortcut |
| --- | --- | --- |
| 0:20 | Play | `Space` |
| 0:30 | Move back three frames | `←` ×3 |
| 0:45 | Probe Seville | click / arrows + `Enter` |
| 1:05 | Story | `S` |
| 1:20 | Stop story | `Esc` |
| 1:22 | Fires | `2` |
| 1:36 | Vegetation | `3` |
| 1:45 | Water | `4` |
| 1:55 | Mute / unmute | `M` |
| 2:00 | Help | `?` |
| 2:15 | Close help | `Esc` |
| 2:25 | Offline reload | stop backend, reload |
| 2:50 | Play water | `4`, `Space` |
