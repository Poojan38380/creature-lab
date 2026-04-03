import { makeRNG } from './rng';

// ── Family definitions ────────────────────────────────────────────

export type FamilyName = 'vowel' | 'apex' | 'scavenger' | 'titan' | 'consonant';

interface FamilyDef {
  chars: string;
  sizeBase: number;
  speedBase: number;
  glowMult: number;
}

// Order matters — getFamily() checks top-to-bottom.
// apex must come before titan so Q/X/Z aren't absorbed by the capital-letter check.
export const FAMILIES: Record<FamilyName, FamilyDef> = {
  vowel:     { chars: 'aeiouAEIOU',          sizeBase: 11, speedBase: 1.9,  glowMult: 1.5 },
  apex:      { chars: 'qxzQXZ',              sizeBase: 21, speedBase: 2.9,  glowMult: 2.2 },
  scavenger: { chars: '0123456789',           sizeBase: 9,  speedBase: 0.75, glowMult: 1.2 },
  titan:     { chars: 'BCDFGHJKLMNPRSTUVWY', sizeBase: 33, speedBase: 0.35, glowMult: 2.8 },
  consonant: { chars: '',                    sizeBase: 15, speedBase: 1.15, glowMult: 1.7 },
};

// ── DNA type ─────────────────────────────────────────────────────

export interface DNA {
  char: string;
  code: number;
  seed: number;
  family: FamilyName;
  // Color
  hue: number;
  sat: number;
  lit: number;
  // Size & motion
  size: number;
  speed: number;
  turnRate: number;
  // Body shape
  numVerts: number;
  bodyType: 0 | 1 | 2;   // 0=smooth blob  1=hard polygon  2=spiky
  deformAmp: number;
  bodyStretch: number;
  // Appendages
  numLegs: number;
  legStyle: 0 | 1 | 2;   // 0=jointed  1=fin  2=tentacle
  legPhase: number;
  // Eyes
  numEyes: number;
  eyeColor: number;
  // Glow & noise
  glowMult: number;
  noiseOff: number;
  noiseScale: number;
}

// ── Builders ─────────────────────────────────────────────────────

export function getFamily(char: string): FamilyName {
  for (const [name, f] of Object.entries(FAMILIES) as [FamilyName, FamilyDef][]) {
    if (f.chars.includes(char)) return name;
  }
  return 'consonant';
}

/**
 * Blends two parent DNAs into an offspring DNA with slight mutation.
 * Preserves family identity (same-family mating only).
 */
export function makeOffspringDNA(dnaA: DNA, dnaB: DNA, seed: number): DNA {
  const r    = makeRNG((dnaA.seed ^ dnaB.seed ^ (seed >>> 0)) >>> 0);
  const base = r() < 0.5 ? dnaA : dnaB;
  const alt  = base === dnaA ? dnaB : dnaA;
  const t    = 0.3 + r() * 0.4;                           // blend factor toward alt
  const lerp = (a: number, b: number) => a + (b - a) * t;
  const mut  = () => 0.88 + r() * 0.24;                   // ±12% mutation

  return {
    ...base,
    seed:        (r() * 0xffffffff) >>> 0,
    hue:         ((lerp(base.hue, alt.hue) + (r() - 0.5) * 22) + 360) % 360,
    sat:         Math.max(40, Math.min(95, lerp(base.sat, alt.sat) * mut())),
    lit:         Math.max(35, Math.min(78, lerp(base.lit, alt.lit) * mut())),
    size:        Math.max(6,  lerp(base.size,  alt.size)  * mut()),
    speed:       Math.max(0.3, lerp(base.speed, alt.speed) * mut()),
    noiseOff:    r() * 2000,
    noiseScale:  Math.max(0.001, lerp(base.noiseScale, alt.noiseScale) * mut()),
  };
}

export function buildDNA(char: string, spawnIndex: number): DNA {
  const code   = char.charCodeAt(0);
  const seed   = (Math.imul(code, 2654435761) ^ Math.imul(spawnIndex, 1234567891)) >>> 0;
  const r      = makeRNG(seed);
  const family = getFamily(char);
  const F      = FAMILIES[family];

  return {
    char, code, seed, family,
    hue:         (code * 53 + 60) % 360,
    sat:         65 + r() * 30,
    lit:         52 + r() * 26,
    size:        F.sizeBase + r() * 10,
    speed:       F.speedBase + r() * 0.9,
    turnRate:    0.022 + r() * 0.065,
    numVerts:    8 + Math.floor(r() * 6),
    bodyType:    Math.floor(r() * 3) as 0 | 1 | 2,
    deformAmp:   0.08 + r() * 0.3,
    bodyStretch: 1.1 + r() * 0.45,
    numLegs:     Math.floor(r() * 5),
    legStyle:    Math.floor(r() * 3) as 0 | 1 | 2,
    legPhase:    r() * Math.PI * 2,
    numEyes:     family === 'apex' ? 3 : family === 'titan' ? 1 : 1 + Math.floor(r() * 2),
    eyeColor:    (code * 29 + 180) % 360,
    glowMult:    F.glowMult + r() * 0.6,
    noiseOff:    r() * 2000,
    noiseScale:  0.0018 + r() * 0.0028,
  };
}
