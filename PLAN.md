# Typographic Creature Lab — Project Plan

> **Vision**: Every letter you type becomes a living creature. Your words become an ecosystem.

---

## Project Overview

A keyboard-driven, browser-based ecosystem simulator. Each character typed spawns a unique procedurally generated organism with its own body, movement, and behavioral personality. Creatures interact with each other — hunting, flocking, fleeing, reproducing. Punctuation triggers environmental events. A seeded URL system lets you share your exact ecosystem with anyone.

**Tech Stack**:
- Single-file HTML artifact (p5.js from CDN — aligned with `algorithmic-art` skill)
- Vanilla JS / p5.js for simulation and rendering
- No build step — fully self-contained, shareable as one file
- URL hash for seed + ecosystem state sharing

**Design Aesthetic** (per `frontend-design` skill):
- Bold direction: **"Bioluminescent Deep Sea Lab"**
- Dark void background (`#04040a`) — creatures glow from within
- Each creature family has its own luminous color signature
- Soft bloom/glow effects via layered semi-transparent renders
- Monospace input field styled as a "DNA sequencer terminal"
- No generic fonts — custom display font for UI (e.g., Space Mono or JetBrains Mono)
- Cursor becomes a tiny light source that creatures react to

---

## Phases

---

### Phase 1 — Foundation & Single Creature

**Goal**: A single character typed spawns one creature that moves around the canvas believably.

**Tasks**:

1. **Project scaffold**
   - Single `index.html` with p5.js CDN
   - Canvas fills viewport, dark background
   - Keyboard listener captures typed characters
   - Styled input terminal overlay (bottom of screen, monospace, glowing cursor)

2. **Creature DNA system**
   - Each character has a deterministic DNA: `charCode → seed → traits`
   - Traits: `bodyType` (circle, polygon, blob), `numAppendages` (0–6), `size` (small–large), `baseColor` (hue from char family), `speed`, `turnRate`, `personality` (timid/bold/curious/aggressive)
   - Same character always produces the same base creature type
   - Visual variation comes from the seed combining charCode + position in word

3. **Creature renderer**
   - Body: procedural polygon/blob using sin/cos with noise-based deformation
   - Appendages: animated legs/fins/tentacles using oscillating transforms
   - Eyes: 1–3 eyes placed algorithmically, pupils track nearby creatures
   - Glow: draw body twice — large blurred pass (low alpha) + sharp pass
   - Death animation: creature dissolves into floating particles

4. **Basic locomotion**
   - Idle wandering: perlin noise steering field
   - Smooth heading interpolation (no snapping)
   - Canvas-edge bouncing with gentle reflection curves

**Deliverable**: Type any key → glowing creature appears and wanders. Delete → death animation.

---

### Phase 2 — Ecosystem Behaviors

**Goal**: Creatures are aware of each other and exhibit emergent social dynamics.

**Tasks**:

1. **Spatial partitioning**
   - Grid-based neighbor lookup (avoid O(n²) per-frame checks)
   - Each creature maintains a perception radius

2. **Behavior system — 4 core drives** (weighted sum steering)
   - **Separation**: avoid crowding neighbors
   - **Cohesion**: drift toward same-species cluster center
   - **Alignment**: match velocity of nearby flockmates
   - **Hunt/Flee**: predator creatures chase prey; prey flee predators

3. **Creature hierarchy from character families**
   - Vowels (`a, e, i, o, u`) → Herd animals: flocking, non-aggressive, fast
   - Consonants (common: `t, n, s, r`) → Mid-tier: territorial, slow aggression
   - Rare consonants (`q, x, z`) → Apex predators: solitary, fast, hunts vowels
   - Numbers → Scavengers: follow death events, eat corpses for energy
   - Capital letters → Titans: giant, slow, immune to predation

4. **Energy & death**
   - Each creature has energy (health bar shown as a subtle aura ring)
   - Energy drains slowly over time
   - Eating restores energy; starvation triggers death animation
   - Predators gain energy by catching prey

5. **Reproduction**
   - Two same-species creatures that stay close long enough "mate"
   - Offspring inherits blended traits with slight mutation
   - Baby creature spawns between parents with a birth particle burst
   - Ecosystem can grow beyond typed characters this way

**Deliverable**: Type a sentence → watch a self-sustaining ecosystem with visible food chains.

---

### Phase 3 — Environmental Events & Punctuation

**Goal**: Non-letter keys trigger dramatic environmental changes that affect the whole ecosystem.

**Punctuation → Event mapping**:

| Key | Event | Visual |
|-----|-------|--------|
| `.` | **Day/Night Cycle Toggle** | Canvas slowly shifts from void-dark to deep indigo; creatures' behavior changes (nocturnal vs diurnal) |
| `!` | **Earthquake** | Screen shakes; shockwave ring expands from center; all creatures scatter |
| `?` | **Confusion Field** | 5-second fog of war; creatures' steering inverts; chaotic spiral movement |
| `,` | **Rain** | Particle rain falls; slows all creatures 30%; aquatic types (vowels) gain speed boost |
| `;` | **Spore Cloud** | Random mutation burst — all creatures shift color hue and one trait randomly changes |
| `:` | **Freeze Frame** | Slow-motion for 3 seconds (deltaTime scaling) — beautiful to watch |
| `(` / `)` | **Gravity Well / Repulsor** | Temporary attractor/repulsor spawns at canvas center |
| `ENTER` | **Genesis Event** | All current creatures pulse with light, then a new generation is born simultaneously |
| `BACKSPACE` | **Death** | Removes last typed character's creature with dissolution animation |
| `SPACE` | **Pause / Resume** | Freezes time; canvas dims; "PAUSED" overlaid in terminal style |

**Tasks**:
1. Event dispatcher system — keyboard events route to named handlers
2. Per-event visual effect (screen shake, overlay, particle burst, color shift)
3. Global environment state object (`isNight`, `gravityWell`, `slowMo`, etc.)
4. Creature behavior checks environment state each frame

**Deliverable**: Typing punctuation dramatically transforms the world. Each sentence tells a story.

---

### Phase 4 — UI / UX Layer & Design Polish

**Goal**: The interface itself is beautiful and expressive. Not an afterthought.

**Tasks**:

1. **DNA Sequencer Terminal** (input area)
   - Fixed bottom panel, full width
   - Dark glass (`rgba(4,4,10,0.9)`) with subtle top border glow
   - Characters render with their creature's color signature as the text color
   - Blinking block cursor animation
   - Deleted characters show as strikethrough briefly before vanishing
   - Label: `> SEQUENCE INPUT_` in monospace

2. **Creature Info Panel** (hover tooltip)
   - Hovering a creature shows: species name (generated from char), energy %, age, kill count, offspring count
   - Styled as a lab specimen card — minimal, clinical, beautiful

3. **Ecosystem Stats Bar** (top right HUD)
   - Live counters: Population | Predators | Prey | Births | Deaths
   - Mini bar chart showing population by creature family
   - Styled as a biometric readout

4. **Ambient Visual Polish**
   - Subtle grid scanline overlay (very low opacity) for "lab" aesthetic
   - Vignette at canvas edges
   - Creature trails: each creature leaves a short fading luminous trail (last 8 positions)
   - Subtle color correction: creatures' glow slightly tints the background behind them

5. **theme-factory integration**
   - Use **Midnight Galaxy** theme as primary palette baseline
   - Add a theme toggle (3 modes): Deep Sea (default) | Neon Circuit | Blood Moon
   - Each theme remaps creature color families + background + UI accent color

**Deliverable**: A visually stunning, cohesive UI that feels like a real bioluminescent lab tool.

---

### Phase 5 — Sharing, Seeds & Final Features

**Goal**: The ecosystem is shareable, explorable, and has high replay value.

**Tasks**:

1. **URL Seed System**
   - URL hash encodes: `#seed=42&text=hello+world&theme=deep-sea`
   - "Share Ecosystem" button copies URL to clipboard
   - On load, URL params restore exact ecosystem state
   - Same seed + same text → identical creatures (deterministic DNA)

2. **Seed Gallery mode**
   - Sidebar or modal: "Famous Ecosystems" — 6 pre-set seed+text combos
   - Each shows a thumbnail (pre-rendered or live) + creature count + ecosystem name
   - One-click to load any preset

3. **Screenshot / Export**
   - "Capture" button: hides UI chrome, takes canvas snapshot, re-shows UI
   - Downloads as `creature-lab-[seed].png`
   - Includes watermark in corner: `creature-lab` in small monospace

4. **Performance optimization**
   - Creature count soft cap at ~200 (kills oldest on overflow)
   - Off-screen creature culling
   - Glow pass only for creatures within viewport
   - requestAnimationFrame budget check — skip glow pass if FPS drops

5. **Easter eggs**
   - Type `life` → all creatures form the word "LIFE" then scatter
   - Type `die` → mass extinction event — dramatic red bloom, all creatures dissolve
   - Type `love` → creatures pair up and waltz in circular patterns
   - Type your name → one creature per letter, they flock together and "name themselves"

**Deliverable**: Complete, polished, shareable experience. Ready to publish.

---

## Phased Milestones Summary

| Phase | Focus | Key Output | Estimated Scope |
|-------|-------|------------|-----------------|
| 1 | Single creature | Spawn + wander + delete | Foundation |
| 2 | Ecosystem dynamics | Food chains, flocking, reproduction | Core sim |
| 3 | Events | Punctuation → world events | Interactivity |
| 4 | UI/UX polish | Beautiful interface, themes | Design layer |
| 5 | Sharing & extras | URLs, gallery, export, easter eggs | Completeness |

---

## File Structure

```
creature-lab/
├── PLAN.md               ← this file
├── index.html            ← single self-contained artifact
└── assets/               ← optional: any local fonts or static files
```

> All logic lives in `index.html` inline — one file to share, no build step required.

---

## Design Principles

- **Every keypress matters** — the most satisfying creative constraint
- **Emergent > scripted** — behaviors arise from simple rules, not hardcoded stories
- **Spectacle by default** — something visually beautiful happens even if the user just watches
- **Zero learning curve** — open page, start typing, magic happens immediately
- **Infinite replay** — same word typed twice produces different ecosystems via seeding

---

## Skills Mapping

| Skill | How It's Used |
|-------|--------------|
| `algorithmic-art` | p5.js architecture, seeded randomness, parameter sliders, viewer template |
| `frontend-design` | Bioluminescent aesthetic direction, UI composition, typography, motion |
| `theme-factory` | 3 color themes (Deep Sea, Neon Circuit, Blood Moon) mapped to creature palettes |
| `web-artifacts-builder` | Optional: if UI complexity warrants React migration in Phase 4 |
