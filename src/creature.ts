import p5 from 'p5';
import { buildDNA, DNA } from './dna';
import { Particle } from './particles';
import { noise, W, H } from './context';
import { env } from './env';

export class Creature {
  readonly id: number;
  readonly dna: DNA;

  x: number;
  y: number;
  heading: number;
  targetH: number;
  noiseT: number;
  age = 0;
  spawnT = 0;    // 0 → 1  (birth scale-in)
  alive = true;
  dying = false;
  dyingT = 0;    // 0 → 1  (death progress)
  particles: Particle[] = [];
  hovered = false;

  // ── Phase 2: ecosystem fields ──────────────────────────────────
  energy  = 1.0;   // 0 → 1; 0 = starvation death
  steerX  = 0;     // behavior force X — set by behaviors.ts, consumed by update()
  steerY  = 0;     // behavior force Y
  reproCD = 0;     // frames until next reproduction attempt

  /**
   * @param charOrDNA  Character string (normal spawn) or pre-built DNA (offspring)
   * @param index      Unique creature id / spawn counter
   * @param x          Optional spawn X (random if omitted)
   * @param y          Optional spawn Y (random if omitted)
   */
  constructor(charOrDNA: string | DNA, index: number, x?: number, y?: number) {
    this.id  = index;
    this.dna = typeof charOrDNA === 'string' ? buildDNA(charOrDNA, index) : charOrDNA;

    const pad  = this.dna.size * 2 + 30;
    const maxY = H() - 140;
    this.x       = x ?? pad + Math.random() * Math.max(1, W() - pad * 2);
    this.y       = y ?? pad + Math.random() * Math.max(1, maxY - pad * 2);
    this.heading = Math.random() * Math.PI * 2;
    this.targetH = this.heading;
    this.noiseT  = this.dna.noiseOff;
  }

  kill(): void {
    if (this.dying) return;
    this.dying = true;
    const { x, y, dna } = this;
    for (let i = 0; i < 16; i++)
      this.particles.push(new Particle(x, y, dna.hue, dna.sat, dna.lit, dna.size));
  }

  update(): void {
    if (!this.alive) return;

    this.spawnT = Math.min(1, this.spawnT + 0.05);

    if (this.dying) {
      // Slow-mo also stretches out the death animation
      this.dyingT    = Math.min(1, this.dyingT + 0.038 * env.slowMo);
      this.particles = this.particles.filter(p => { p.step(); return !p.dead; });
      if (this.dyingT >= 1 && this.particles.length === 0) this.alive = false;
      return;
    }

    this.age++;
    this.noiseT += 0.0038 * env.slowMo;

    // Perlin noise steering
    const nx = noise(this.x * this.dna.noiseScale + this.noiseT, this.y * this.dna.noiseScale);
    const ny = noise(this.x * this.dna.noiseScale, this.y * this.dna.noiseScale + this.noiseT + 100);
    this.targetH += ((nx - 0.5) * 0.42 + (ny - 0.5) * 0.2) * this.dna.turnRate * 6;

    // Behavior steering force → blend into targetH
    if (this.steerX !== 0 || this.steerY !== 0) {
      // Confusion: invert steering (creatures flee flockmates, chase predators)
      if (env.confusion > 0) { this.steerX *= -1.3; this.steerY *= -1.3; }
      const bh = Math.atan2(this.steerY, this.steerX);
      let bd = bh - this.targetH;
      bd = ((bd + Math.PI) % (Math.PI * 2)) - Math.PI;
      this.targetH += bd * 0.14;
      this.steerX = 0;
      this.steerY = 0;
    }

    // Confusion: extra random heading chaos
    if (env.confusion > 0) this.targetH += (Math.random() - 0.5) * 0.52;

    // Smooth heading interpolation (shortest arc)
    let d = this.targetH - this.heading;
    d = ((d + Math.PI) % (Math.PI * 2)) - Math.PI;
    this.heading += d * 0.07;

    // Gravity well / repulsor — applied directly to targetH so it cannot
    // be normalised away by other steering forces
    if (env.gravField) {
      const { x: gx, y: gy, attract } = env.gravField;
      const gdx = gx - this.x;
      const gdy = gy - this.y;
      const gd  = Math.sqrt(gdx * gdx + gdy * gdy) + 1;
      const dir = attract ? 1 : -1;
      const gh  = Math.atan2(dir * gdy, dir * gdx); // angle toward / away from field
      let gbd   = gh - this.targetH;
      gbd = ((gbd + Math.PI) % (Math.PI * 2)) - Math.PI;
      this.targetH += gbd * (1.2 / (1 + gd / 120)); // strong falloff by distance
    }

    // Speed — scaled by slow-mo and rain
    let speedMul = env.slowMo;
    if (env.rain) speedMul *= this.dna.family === 'vowel' ? 1.18 : 0.68;

    this.x += Math.cos(this.heading) * this.dna.speed * speedMul;
    this.y += Math.sin(this.heading) * this.dna.speed * speedMul;

    // Boundary bounce
    const m    = this.dna.size * 1.8;
    const maxY = H() - 130;
    if (this.x < m)        { this.x = m;        this.targetH = 0; }
    if (this.x > W() - m)  { this.x = W() - m;  this.targetH = Math.PI; }
    if (this.y < m)        { this.y = m;         this.targetH = Math.PI * 0.5; }
    if (this.y > maxY - m) { this.y = maxY - m;  this.targetH = -Math.PI * 0.5; }
  }

  draw(p: p5): void {
    if (!this.alive) return;

    const { dna, age, x, y, heading, spawnT, dying, dyingT } = this;
    const scl  = spawnT * (dying ? Math.pow(1 - dyingT, 0.6) : 1);
    const alph = spawnT * (dying ? (1 - dyingT) : 1);
    if (alph < 0.01) return;

    // Death particles in world-space (before push/translate)
    for (const pt of this.particles) {
      p.noStroke();
      p.fill(pt.hue, pt.sat, pt.lit, pt.life * 0.75);
      p.ellipse(pt.x, pt.y, pt.r * pt.life * 2);
    }

    const s = dna.size * scl;

    // Spore hue shift — shift all colour calls while active
    const effDna = env.sporeShift !== 0
      ? { ...dna, hue: ((dna.hue + env.sporeShift) % 360 + 360) % 360 }
      : dna;

    p.push();
    p.translate(x, y);
    p.rotate(heading + Math.PI * 0.5);

    this._drawGlow(p, s, alph, effDna);
    this._drawAppendages(p, s, alph, age, effDna);
    this._drawBody(p, s, alph, age, effDna);
    this._drawEyes(p, s, alph, age, effDna);

    p.pop();

    // Selection ring (hover)
    if (this.hovered) {
      p.noFill();
      p.stroke(effDna.hue, effDna.sat, 90, 0.35);
      p.strokeWeight(1.2);
      p.ellipse(x, y, s * 3.5, s * 3.5);
    }

    // Low-energy warning ring — appears below 55%, pulses red below 25%
    if (this.energy < 0.55 && !this.dying) {
      const danger = 1 - this.energy / 0.55;           // 0 → 1 as energy drops
      const pulse  = this.energy < 0.25
        ? 0.35 + 0.65 * Math.abs(Math.sin(this.age * 0.12))
        : 1.0;
      p.noFill();
      p.stroke(8, 82, 55, danger * 0.5 * pulse);       // dim orange-red
      p.strokeWeight(1.5);
      p.ellipse(x, y, s * 3.8, s * 3.8);
    }
  }

  distSq(px: number, py: number): number {
    const dx = this.x - px, dy = this.y - py;
    return dx * dx + dy * dy;
  }

  // ── Private draw helpers ────────────────────────────────────────

  private _drawGlow(p: p5, s: number, alph: number, dna: DNA): void {
    p.noStroke();
    const gr = s * dna.glowMult;
    p.fill(dna.hue, dna.sat, dna.lit, alph * 0.035); p.ellipse(0, 0, gr * 3.0, gr * 3.0);
    p.fill(dna.hue, dna.sat, dna.lit, alph * 0.055); p.ellipse(0, 0, gr * 2.0, gr * 2.0);
    p.fill(dna.hue, dna.sat, dna.lit, alph * 0.09);  p.ellipse(0, 0, gr * 1.3, gr * 1.3);
    p.fill(dna.hue, dna.sat, dna.lit, alph * 0.14);  p.ellipse(0, 0, gr * 0.85, gr * 0.85);
  }

  private _drawBody(p: p5, s: number, alph: number, age: number, dna: DNA): void {
    p.fill(dna.hue, dna.sat, dna.lit, alph * 0.9);
    p.stroke(dna.hue, dna.sat, Math.min(95, dna.lit + 25), alph * 0.45);
    p.strokeWeight(0.9);

    const V = dna.numVerts;
    p.beginShape();
    for (let i = 0; i < 52; i++) {
      const ang = (i / 52) * Math.PI * 2;
      let rx = s, ry = s * dna.bodyStretch;

      if (dna.bodyType === 0) {
        const nd  = noise(Math.cos(ang) * 1.8 + dna.seed * 0.00001 + age * 0.006, Math.sin(ang) * 1.8);
        const def = 0.78 + dna.deformAmp * nd * 2.4;
        rx *= def; ry *= def;
      } else if (dna.bodyType === 1) {
        const t    = (ang / (Math.PI * 2)) * V - Math.floor((ang / (Math.PI * 2)) * V);
        const snap = 0.5 + Math.abs(t - 0.5);
        rx *= snap; ry *= snap;
      } else {
        const spine = i % 4 < 2;
        rx *= spine ? 1 + dna.deformAmp * 1.6 : 0.62;
        ry *= spine ? 1 + dna.deformAmp * 1.6 : 0.62;
      }

      p.vertex(rx * Math.cos(ang), ry * Math.sin(ang));
    }
    p.endShape(p.CLOSE);
  }

  private _drawAppendages(p: p5, s: number, alph: number, age: number, dna: DNA): void {
    if (dna.numLegs === 0) return;
    p.noFill();
    p.stroke(dna.hue, dna.sat, dna.lit + 12, alph * 0.6);
    p.strokeWeight(1.0);

    const half = Math.ceil(dna.numLegs / 2);
    for (let i = 0; i < dna.numLegs; i++) {
      const side = i < half ? -1 : 1;
      const idx  = i < half ? i : i - half;
      const ay   = -s * 0.35 + idx * s * 0.42;
      const ax   = side * s * 0.68;
      const wave = Math.sin(age * 0.14 + dna.legPhase + idx * 1.4) * 0.55;

      if (dna.legStyle === 0) {
        const mx = ax + side * s * 0.88 * Math.cos(0.7 + wave);
        const my = ay + s * 0.88 * Math.abs(Math.sin(0.7 + wave));
        p.line(ax, ay, mx, my);
        p.line(mx, my, mx + side * s * 0.52, my + s * 0.36);
      } else if (dna.legStyle === 1) {
        p.beginShape();
        p.curveVertex(ax,                    ay);
        p.curveVertex(ax + side * s * 0.4,   ay - s * 0.15);
        p.curveVertex(ax + side * s * 1.35,  ay - s * 0.2 + wave * s * 0.45);
        p.curveVertex(ax + side * s * 1.0,   ay + s * 0.5);
        p.curveVertex(ax,                    ay + s * 0.12);
        p.endShape();
      } else {
        p.beginShape();
        for (let t = 0; t <= 8; t++) {
          const tt = t / 8;
          p.curveVertex(
            ax + side * s * 1.4 * tt,
            ay + tt * s * 1.2 + Math.sin(tt * Math.PI * 2.8 + age * 0.12 + idx + dna.legPhase) * s * 0.28 * tt,
          );
        }
        p.endShape();
      }
    }
  }

  private _drawEyes(p: p5, s: number, alph: number, age: number, dna: DNA): void {
    const eSz    = s * 0.26;
    const spread = dna.numEyes === 1 ? 0 : s * 0.3;

    for (let i = 0; i < dna.numEyes; i++) {
      const off   = dna.numEyes === 1 ? 0 : i - (dna.numEyes - 1) / 2;
      const ex    = off * spread;
      const ey    = -s * dna.bodyStretch * 0.66;
      const drift = Math.sin(age * 0.042 + i * 2.3) * eSz * 0.22;

      p.noStroke();
      p.fill(0, 0, 95, alph * 0.93);
      p.ellipse(ex, ey, eSz * 2.0, eSz * 1.55);          // sclera

      p.fill(dna.eyeColor, 70, 40, alph * 0.95);
      p.ellipse(ex + drift, ey, eSz * 0.85, eSz * 0.85); // iris

      p.fill(0, 0, 8, alph);
      p.ellipse(ex + drift, ey, eSz * 0.45, eSz * 0.45); // pupil

      p.fill(0, 0, 100, alph * 0.8);
      p.ellipse(ex + drift + eSz * 0.2, ey - eSz * 0.22, eSz * 0.22, eSz * 0.22); // catchlight
    }
  }
}
