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
