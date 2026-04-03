import { Creature } from './creature';
import { DNA, FamilyName, makeOffspringDNA } from './dna';
import { SpatialGrid } from './grid';


// ── Configuration ────────────────────────────────────────────────

const PERCEPTION    = 120;   // px — neighbour scan radius
const ENERGY_DRAIN  = 0.0001; // per tick; ~167 s from full to 0 at 60fps
const MIN_POP_DRAIN = 5;     // drain is inactive below this live-creature count
const MAX_POP       = 80;    // reproduction cap
const REPRO_CD      = 350;   // frames (≈6 s) cooldown per creature after mating
const REPRO_DIST    = 50;    // px — proximity required to mate
const REPRO_ENERGY  = 0.72;  // minimum energy to reproduce
const EAT_DIST_MUL  = 2.0;   // eat_range = (c.size + prey.size) * mul * 0.5

// Steering weights
const W_SEP  = 2.8;
const W_COH  = 0.30;
const W_ALI  = 0.50;
const W_HUNT = 1.3;
const W_FLEE = 2.6;

// Which family hunts which families
const HUNT_MAP: Partial<Record<FamilyName, FamilyName[]>> = {
  apex:      ['vowel', 'consonant'],
  consonant: ['scavenger'],
};

export interface SpawnRequest { dna: DNA; x: number; y: number; }

// ── Main ─────────────────────────────────────────────────────────

/**
 * Runs one frame of ecosystem behaviours:
 * – energy drain / starvation
 * – separation, cohesion, alignment, hunt / flee steering
 * – reproduction
 *
 * Steering results are written to `c.steerX / c.steerY`; the Creature's
 * `update()` consumes and clears them.
 *
 * Reproduction fires `onSpawn` with the offspring DNA + position; the caller
 * constructs the Creature and pushes it into the main array.
 */
export function applyBehaviors(
  creatures: Creature[],
  grid: SpatialGrid,
  onSpawn: (req: SpawnRequest) => void,
): void {
  grid.rebuild(creatures);

  const alive   = creatures.filter(c => c.alive && !c.dying).length;
  const drainOn = alive >= MIN_POP_DRAIN;

  for (const c of creatures) {
    if (!c.alive || c.dying) continue;

    // ── Energy drain ──────────────────────────────────────────────
    if (drainOn) {
      c.energy -= ENERGY_DRAIN;
      if (c.energy <= 0) { c.energy = 0; c.kill(); continue; }
    }

    // ── Reproduction cooldown ──────────────────────────────────────
    if (c.reproCD > 0) c.reproCD--;

    const isTitan  = c.dna.family === 'titan';
    const neighbors = grid.getNearby(c.x, c.y, PERCEPTION);

    let sepX = 0, sepY = 0;
    let cohX = 0, cohY = 0, cohN = 0;
    let aliX = 0, aliY = 0, aliN = 0;
    let huntX = 0, huntY = 0;
    let fleeX = 0, fleeY = 0;

    const prey = isTitan ? undefined : HUNT_MAP[c.dna.family];

    for (const o of neighbors) {
      if (o === c || !o.alive || o.dying) continue;

      const dx   = o.x - c.x;
      const dy   = o.y - c.y;
      const dSq  = dx * dx + dy * dy;
      if (dSq < 0.1) continue;
      const dist = Math.sqrt(dSq);

      // ── Separation (all families) ──────────────────────────────
      const sepR = (c.dna.size + o.dna.size) * 1.8;
      if (dist < sepR) {
        const str = 1 - dist / sepR;
        sepX -= (dx / dist) * str;
        sepY -= (dy / dist) * str;
      }

      // Titans only do separation — skip all social/predator logic
      if (isTitan) continue;

      // ── Same-family behaviours ─────────────────────────────────
      if (o.dna.family === c.dna.family) {

        // Cohesion — all non-titan families
        cohX += dx; cohY += dy; cohN++;

        // Alignment — herding species only
        if (c.dna.family === 'vowel' || c.dna.family === 'consonant') {
          if (dist < PERCEPTION * 0.5) {
            aliX += Math.cos(o.heading);
            aliY += Math.sin(o.heading);
            aliN++;
          }
        }

        // Reproduction — one side spawns (lower id wins) to avoid doubles
        if (
          c.reproCD === 0 && o.reproCD === 0 &&
          c.id < o.id &&
          dist < REPRO_DIST &&
          c.energy > REPRO_ENERGY && o.energy > REPRO_ENERGY &&
          alive < MAX_POP
        ) {
          const offDNA = makeOffspringDNA(
            c.dna, o.dna,
            Date.now() ^ (c.id * 31337 + o.id),
          );
          c.energy  -= 0.28;
          o.energy  -= 0.28;
          c.reproCD  = REPRO_CD;
          o.reproCD  = REPRO_CD;
          onSpawn({ dna: offDNA, x: (c.x + o.x) * 0.5, y: (c.y + o.y) * 0.5 });
        }
      }

      // ── Hunt / Flee ────────────────────────────────────────────
      if (prey?.includes(o.dna.family)) {
        // c chases o
        const str = PERCEPTION / (dist + PERCEPTION * 0.25);
        huntX += (dx / dist) * str;
        huntY += (dy / dist) * str;

        // Eat on contact
        const eatR = (c.dna.size + o.dna.size) * EAT_DIST_MUL * 0.5;
        if (dist < eatR && !o.dying) {
          o.kill();
          c.energy = Math.min(1.0, c.energy + 0.42);
        }
      } else {
        // Does o hunt c?
        const oPrey = HUNT_MAP[o.dna.family];
        if (oPrey?.includes(c.dna.family)) {
          // Flee — inversely proportional to distance squared (panic at close range)
          const str = (PERCEPTION * PERCEPTION) / (dSq + 1) * 0.015;
          fleeX -= (dx / dist) * str;
          fleeY -= (dy / dist) * str;
        }
      }
    }

    // ── Combine and normalise forces ──────────────────────────────
    // NOTE: gravity well / repulsor is applied in creature.ts directly to
    // targetH so it cannot be normalised away by other forces.
    let fx = sepX * W_SEP;
    let fy = sepY * W_SEP;

    if (!isTitan) {
      if (cohN > 0) { fx += (cohX / cohN) * W_COH; fy += (cohY / cohN) * W_COH; }
      if (aliN > 0) { fx += (aliX / aliN) * W_ALI; fy += (aliY / aliN) * W_ALI; }
      fx += huntX * W_HUNT + fleeX * W_FLEE;
      fy += huntY * W_HUNT + fleeY * W_FLEE;
    }

    const mag = Math.sqrt(fx * fx + fy * fy);
    if (mag > 0.01) {
      c.steerX = fx / mag;
      c.steerY = fy / mag;
    }
  }
}
