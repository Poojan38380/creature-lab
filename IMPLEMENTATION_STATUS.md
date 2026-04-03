# Creature Lab — Implementation Status

> Last updated: 2026-04-04 (Phase 3 + fixes)

---

## Overall Progress

| Phase | Status | Description |
|-------|--------|-------------|
| 1 — Foundation | ✅ Complete | Single creature spawn, DNA, locomotion, UI |
| 2 — Ecosystem Behaviors | ✅ Complete | Food chains, flocking, energy, reproduction |
| 3 — Environmental Events | ✅ Complete | Punctuation-triggered world events |
| 4 — UI/UX Polish | ⬜ Not started | Themes, panels, design layer |
| 5 — Sharing & Extras | ⬜ Not started | URL seeds, gallery, export, easter eggs |

---

## Phase 1 — Foundation ✅

**Completed: 2026-04-03**

### What was built

#### Seeded RNG
- Xorshift-based deterministic RNG (`makeRNG(seed)`)
- Same character at same spawn index always produces identical creature

#### Character → DNA System
- `buildDNA(char, spawnIndex)` maps any printable character to a full trait set
- Five creature families derived from character type:

| Input | Family | Size | Speed | Glow |
|-------|--------|------|-------|------|
| `a e i o u` (any case) | Herd Animal | Small (11) | Fast (1.9) | Medium |
| `Q X Z` | Apex Predator | Large (21) | Fastest (2.9) | Intense |
| `0–9` | Scavenger | Tiny (9) | Slow (0.75) | Dim |
| `A–Z` capitals (non-apex) | Titan | Massive (33) | Slowest (0.35) | Huge |
| lowercase consonants | Wanderer | Medium (15) | Medium (1.15) | Standard |

- DNA traits: `hue`, `sat`, `lit`, `size`, `speed`, `turnRate`, `numVerts`, `bodyType`, `deformAmp`, `numLegs`, `legStyle`, `legPhase`, `numEyes`, `eyeColor`, `glowMult`, `noiseOff`, `noiseScale`, `bodyStretch`

#### Creature Renderer
- **Body**: 52-point shape with 3 body types:
  - `0` smooth blob (Perlin noise deformation)
  - `1` hard polygon (faceted)
  - `2` spiky (alternating spine amplitude)
- **Glow**: 4-layer radial ellipse pass (opacity 3.5% → 5.5% → 9% → 14%) sized by `glowMult`
- **Appendages**: 0–4 per creature, 3 styles:
  - Jointed legs (2-segment with wave animation)
  - Fins (curveVertex smooth shape)
  - Tentacles (oscillating multi-point curve)
- **Eyes**: 1–3 eyes with sclera, iris, pupil, catchlight; pupils drift with `sin(age)`
- **Birth animation**: Scale 0→1 over ~20 frames on spawn
- **Death animation**: Scale shrinks + dissolves; 16 particles burst outward

#### Locomotion
- Perlin noise steering field sampled at creature's world position + time offset
- Each creature has unique `noiseOff` so no two move identically
- Smooth heading interpolation (exponential approach, coefficient 0.07)
- Canvas-edge bounce: heading snapped to inward angle on boundary contact

#### Trail System
- Last 12 positions stored per creature
- Drawn as tapered lines, opacity and weight scale with trail age
- Cleaned up on creature death

#### UI
- **Terminal bar** (bottom): DNA Sequencer input — characters render in their creature's HSL color, blinking block caret
- **HUD** (top-right): Live POPULATION / SPAWNED / EXTINCT counters, updated every 15 frames
- **Hint** overlay: "START TYPING TO SPAWN CREATURES" — fades out on first keypress
- **Hover tooltip**: Shows CHAR, FAMILY, AGE (ticks), SPEED, EYES on mouse proximity
- **Hover ring**: Subtle selection ring drawn around nearest creature to cursor

#### Rendering Pipeline (per frame)
1. Soft background rect (`rgba` 0.2 alpha) — creates motion-blur persistence
2. Trail system draw
3. Creature update + draw (death particles in world-space, body in local-space)
4. Dead creatures removed from array

#### Technical
- Single `index.html`, no build step
- p5.js 1.9.4 from CDN
- `colorMode(HSL, 360, 100, 100, 1)` — all color calls use HSL
- Canvas fixed-position, z-index 1; UI layer z-index 10

---

## Phase 2 — Ecosystem Behaviors ✅

**Completed: 2026-04-04**

### What was built

#### Spatial Grid (`src/grid.ts`)
- `SpatialGrid` class — uniform hash grid, cell size 120 px
- `rebuild(creatures)` clears and repopulates each frame from live creatures
- `getNearby(x, y, radius)` scans all cells within radius, returns flat array
- 32-bit key from two 15-bit cell coordinates (no collisions at any realistic screen size)
- O(1) average neighbour lookup — eliminates O(n²) per-frame all-pairs checks

#### Behavior Engine (`src/behaviors.ts`)
- `applyBehaviors(creatures, grid, onSpawn)` runs once per draw frame
- Steering results written to `c.steerX / c.steerY`; consumed and cleared by `Creature.update()`

**4 steering drives (weighted sum):**

| Drive | Families | Weight | Description |
|-------|----------|--------|-------------|
| Separation | All | 2.8 | Repel if inside personal space `(sizeA + sizeB) × 1.8` |
| Cohesion | All except titan | 0.30 | Drift toward same-family cluster centre |
| Alignment | Vowel, Consonant | 0.50 | Match heading of nearby flockmates |
| Hunt | Apex → vowel/consonant; Consonant → scavenger | 1.3 | Chase prey; eat on contact |
| Flee | Vowel/Consonant from apex; Scavenger from consonant | 2.6 | Panic-flee (inversely proportional to dist²) |

**Titan exception**: titans only compute separation — no flocking, no predation, no fleeing.

#### Predator / Prey Hierarchy
```
Apex  →  hunts Vowel, Consonant
Consonant  →  hunts Scavenger
Titan  →  immune (never hunted, never hunts)
```
- Eat range = `(predator.size + prey.size) × 2.0 × 0.5`
- Successful kill: prey.kill() + predator.energy += 0.42

#### Energy System
- All creatures start at `energy = 1.0`
- Drain: `−0.0001 / tick` (~167 s to starvation at 60 fps)
- Drain only active when ≥ 5 creatures alive — small ecosystems don't die immediately
- `energy = 0` → `c.kill()` (starvation, same death animation as manual delete)
- Low-energy warning ring in renderer: dim orange ring below 55%, pulses red below 25%

#### Reproduction
- Same family, both creatures within 50 px, both `energy > 0.72`, both cooldown = 0
- Lower-ID creature spawns offspring (prevents double-spawn from both parents)
- Offspring DNA: `makeOffspringDNA(dnaA, dnaB, seed)` in `dna.ts`
  - Blends hue, sat, lit, size, speed, noiseScale toward alt parent by `t = 0.3–0.7`
  - ±12% mutation factor on each blended trait
  - Inherits `char`, `family`, `bodyType`, appendage layout from random base parent
- Both parents lose 0.28 energy; 350-frame reproduction cooldown (≈6 s) per parent
- Hard cap: no offspring if `alive ≥ 80`
- Offspring spawns at midpoint between parents, `spawnOffspring` in main.ts assigns proper id

#### Death Counting
- `totalDead` is now incremented exclusively in the draw loop when `!c.alive`
- Covers all death sources: manual backspace, starvation, predation

#### New `Creature` fields
- `energy = 1.0` — ecosystem health value
- `steerX = 0 / steerY = 0` — per-frame behavior force (set by behaviors, cleared in update)
- `reproCD = 0` — reproduction cooldown counter
- Constructor now accepts `string | DNA` (second path for offspring) + optional `x, y`

#### File changes
| File | Change |
|------|--------|
| `src/grid.ts` | New — spatial hash grid |
| `src/behaviors.ts` | New — behavior engine |
| `src/dna.ts` | Added `makeOffspringDNA()` |
| `src/creature.ts` | New fields, constructor overload, steering in update(), energy ring in draw() |
| `src/main.ts` | Grid + behaviors wired into draw loop; `spawnOffspring` callback |

---

## Phase 3 — Environmental Events ✅

**Completed: 2026-04-04**

### What was built

#### New files
| File | Role |
|------|------|
| `src/env.ts` | `EnvState` singleton, `tickEnv()`, `drawEnvEffects(p)`, rain helpers |
| `src/events.ts` | `isPunctuation()`, `handlePunctuation(key, creatures)` dispatcher |

Architecture avoids import cycles: `env.ts` has no creature imports; `events.ts` imports both creature + env; `creature.ts` and `behaviors.ts` import env only.

#### Event map

| Key | Event | Implementation |
|-----|-------|----------------|
| `.` | **Day/Night Toggle** | Flips `env.isNight`; background fill shifts from `hsl(240,40,2)` to `hsl(232,55,5)` — gradual indigo wash via the persistence rect |
| `!` | **Earthquake** | `env.shake = 24` (decays 18% per frame via `resetMatrix` + random translate); shockwave ring expands from canvas center; all creatures scatter to random headings |
| `?` | **Confusion Field** | `env.confusion = 300` (5 s); in `creature.update()`: steering inverted ×1.3 + 0.52 rad random heading noise each tick; purple tint overlay |
| `,` | **Rain** | 90 diagonal rain streaks fall for 8 s; vowels gain ×1.18 speed, all others ×0.68 |
| `;` | **Spore Cloud** | `env.sporeShift` set to ±28–80 hue degrees; applied as `effDna` spread in `creature.draw()` affecting all colour passes; decays via `sporeShift *= 0.991` over 4.3 s |
| `:` | **Freeze Frame** | `env.slowMo = 0.20`; scales `noiseT` advancement, speed, and death animation rate; lerps back to 1.0 at +0.0028/tick (~6 s) |
| `(` | **Gravity Well** | `env.gravField` set attract=true at canvas center, 4 s TTL; in `behaviors.ts`: directional force `95/(dist+55)` added before normalisation |
| `)` | **Repulsor** | Same as `(` with `attract=false`; creatures scatter outward |
| `ENTER` | **Genesis** | `env.genesisPulse = 70` (canvas flash); all creatures `energy += 0.35`, `reproCD = 0` → mass reproduction burst next frame |
| `SPACE` | **Pause / Resume** | `env.paused` toggle; pause overlay shown; `tickEnv`, `applyBehaviors`, and `c.update()` all skip while paused |

#### Screen shake
`sk.resetMatrix()` called at start of every draw frame; random translate of `±shake` px applied when `env.shake > 0.5`; shake decays ×0.82 per frame.

#### Spore hue shift
Avoids modifying `dna` (readonly); instead creates `effDna = { ...dna, hue: shifted }` at draw time only when `env.sporeShift !== 0`. All four draw helpers receive `effDna`. Trails use original `dna.hue` (deliberate — old trails show pre-mutation colours).

#### Input handling
- `keydown`: intercepts `Enter` and `Space` with `preventDefault` (prevents scroll/form-submit)
- `input` event: `isPunctuation(char)` check routes to `handlePunctuation` before `spawnChar`; `insertLineBreak` inputType handles mobile Enter

#### File changes
| File | Change |
|------|--------|
| `src/env.ts` | New |
| `src/events.ts` | New |
| `src/creature.ts` | Import env; slowMo/confusion/rain in update(); spore effDna in draw() |
| `src/behaviors.ts` | Import env; gravity well force before normalisation |
| `src/main.ts` | Import env/events; keydown + input handler updated; draw loop wired |
| `index.html` | `#pause-overlay` div added |
| `src/style.css` | Pause overlay styles |

---

## Phase 4 — UI/UX Polish ⬜

**Status: Not started**

### Planned

- Creature info panel (hover → full specimen card)
- Ecosystem stats bar with population chart
- 3 color themes: Deep Sea (default), Neon Circuit, Blood Moon
- Scanline + vignette overlay
- Ambient background color tinting from nearby creatures

---

## Phase 5 — Sharing & Extras ⬜

**Status: Not started**

### Planned

- URL hash: `#seed=42&text=hello&theme=deep-sea`
- "Share Ecosystem" clipboard button
- Preset gallery (6 famous ecosystems)
- Screenshot export (`creature-lab-[seed].png`)
- Easter eggs: `life`, `die`, `love`, typing your name

---

## Project Structure

```
creature-lab/
├── index.html                 ← minimal Vite entry point (HTML shell only)
├── package.json               ← p5, @types/p5, vite, typescript
├── vite.config.ts
├── tsconfig.json              ← strict ES2020, bundler moduleResolution
├── PLAN.md                    ← full project plan
├── IMPLEMENTATION_STATUS.md  ← this file
└── src/
    ├── main.ts       ← p5 sketch + keyboard/mouse input + game loop
    ├── creature.ts   ← Creature class (update, draw, kill)
    ├── dna.ts        ← DNA interface, FAMILIES, buildDNA(), getFamily()
    ├── rng.ts        ← makeRNG() — xorshift32 seeded PRNG
    ├── particles.ts  ← Particle class (death debris)
    ├── trails.ts     ← updateTrails(), drawTrails()
    ├── ui.ts         ← DOM: terminal, HUD, tooltip
    ├── context.ts    ← shared noise fn + W/H helpers (live ES module bindings)
    ├── grid.ts       ← SpatialGrid — O(1) neighbour lookup (Phase 2)
    ├── behaviors.ts  ← ecosystem behavior engine: steering, energy, reproduction (Phase 2)
    ├── env.ts        ← EnvState singleton, tickEnv, drawEnvEffects (Phase 3)
    ├── events.ts     ← punctuation event dispatcher (Phase 3)
    └── style.css     ← all styles (extracted from old monolithic index.html)
```

### Dev workflow
```bash
npm install
npm run dev     # Vite dev server with HMR
npm run build   # bundles to dist/ (single distributable)
```

---

## Post-Phase-3 Fixes & Additions (2026-04-04)

### Gravity well / Repulsor fix
**Root cause**: gravity force was folded into `huntX/huntY` in `behaviors.ts` and then normalised to a unit vector — magnitude discarded, overwhelmed by separation forces.
**Fix**: removed from `behaviors.ts` entirely. Now applied in `creature.ts update()` as a direct `targetH` manipulation (same pattern as confusion), bypassing the normalisation step. Strength: `1.2 / (1 + dist / 120)` — strong at close range, visible from any distance.

### In-game quick guide (`#quick-guide`)
- Centred DOM overlay visible when `living === 0` (checked every 15 frames + on first spawn)
- Shows: spawn/backspace/hover controls + all 10 punctuation event keys in a 2-column grid
- CSS `transition: opacity 0.7s` gives smooth fade when first creature spawns or last one dies
- Hides immediately on `spawnChar()` call; reappears after all creatures die/starve

### Field guide updated (`guide.html`)
- New `// PUNCTUATION EVENTS` section between HOW TO PLAY and THE FIVE FAMILIES
- Full table of all 10 events with key, event name, and detailed description
- Styled with `.event-table` CSS consistent with rest of guide

## Known Issues / Notes

- `noise` in `context.ts` is initialized to `() => 0.5` — safe because creatures only call it inside `update()` which runs inside `sk.draw()`, after `setNoise()` has been called in `sk.setup()`.
- `getFamily()` checks `apex` before `titan` — intentional, so Q/X/Z are not absorbed by the capital-letter titan check.
- Refactored from single `index.html` to Vite + TypeScript on 2026-04-03. The old monolithic file is superseded.
