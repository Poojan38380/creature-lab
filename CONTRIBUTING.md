# Contributing to Typographic Creature Lab

Thank you for your interest in contributing! This is a creative coding project — all contributions are welcome, whether it's a bug fix, visual tweak, new feature, or documentation.

---

## Quick Start

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/creature-lab.git
cd creature-lab

# Install dependencies
npm install

# Start the development server (with hot reload)
npm run dev

# Build for production
npm run build
```

Open `http://localhost:5173` and start typing.

---

## Code Style

- **TypeScript strict mode** — no `any` unless there's a good reason
- **No semicolons** — the project relies on ASI (Automatic Semicolon Insertion)
- **2-space indentation**
- **Single quotes** for strings
- **camelCase** for variables/functions, **PascalCase** for classes/types
- **Descriptive names** — `buildDNA` not `mk`, `creature` not `c` (except loop locals)

---

## Architecture Overview

The project uses a **data-driven architecture**:

```
Input → DNA → Creature → Behavior Engine → Renderer (p5.js)
                ↑              ↓
            Environment ← Events
```

| Module | Responsibility |
|--------|---------------|
| `dna.ts` | Deterministic character → trait mapping |
| `creature.ts` | Individual organism: update, draw, death |
| `grid.ts` | Spatial hash grid for O(1) neighbour lookups |
| `behaviors.ts` | Steering forces: separation, cohesion, hunt, flee, reproduction |
| `env.ts` | Global environment state (night, rain, slow-mo, shake…) |
| `events.ts` | Punctuation → event dispatcher |
| `main.ts` | p5 sketch, input handling, game loop orchestration |

### Key Design Patterns

- **Weighted sum steering** — behaviours output forces that are summed and normalised
- **Spatial partitioning** — uniform hash grid avoids O(n²) checks
- **Seeded PRNG** — deterministic DNA from character codes (Xorshift32)
- **Soft persistence** — semi-transparent background rect creates motion blur

---

## Adding New Features

### New Punctuation Events

1. Add the key mapping in `src/events.ts` → `handlePunctuation()`
2. Add state to `EnvState` in `src/env.ts`
3. Add visual effect in `drawEnvEffects()`
4. Wire the creature-side effects in `creature.ts update()` or `behaviors.ts`
5. Document it in `guide.html` and `README.md`

### New Creature Families

1. Add family traits in `src/dna.ts` → `FAMILIES`
2. Update `buildDNA()` to classify the character type
3. Add behaviour weights in `src/behaviors.ts`
4. Document the family in `guide.html` and `README.md`

### New Visual Effects

- Effects that affect the **whole canvas** go in `env.ts` → `drawEnvEffects()`
- Effects that affect **individual creatures** go in `creature.ts` → `draw()`
- Use `effDna` pattern for draw-time modifications (see spore cloud)

---

## Commit Message Style

- Keep it concise: **what changed + why**
- Use imperative mood: `"Add rain slow-down"` not `"Added rain slow-down"`
- Prefix with module for scope: `"behaviors: fix gravity well normalization"`

Examples:
```
Add favicon to index.html and guide.html
behaviors: fix gravity well force normalization
env: add slow-motion decay over time
```

---

## Pull Request Process

1. Create a branch with a descriptive name: `feat/rain-slowdown`, `fix/trail-memory-leak`
2. Make your changes
3. Run `npm run build` — ensure there are no TypeScript errors
4. Open a PR with a description of what changed
5. Screenshots or GIFs for visual changes are highly appreciated

---

## Reporting Issues

When filing a bug, please include:

- **Browser** and version
- **Operating system**
- **Steps to reproduce**
- **Expected vs actual behaviour**
- **Screenshots** if applicable

---

## Design Philosophy

- **Every keypress matters** — something visually interesting should happen even if the user just watches
- **Emergent > scripted** — behaviours arise from simple rules, not hardcoded stories
- **Spectacle by default** — the default experience should be visually compelling
- **Zero learning curve** — open page, start typing, magic happens
- **Performance first** — 60 fps is the target; visual effects should not break this

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
