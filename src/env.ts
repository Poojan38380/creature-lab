import p5 from 'p5';
import { W, H } from './context';

// ── Types ─────────────────────────────────────────────────────────

interface RainDrop { x: number; y: number; vx: number; vy: number; len: number; }
interface Shockwave { x: number; y: number; r: number; maxR: number; }

export interface GravField {
  x: number; y: number;
  attract: boolean;   // true = gravity well, false = repulsor
  ttl: number;
}

export interface EnvState {
  paused:       boolean;
  isNight:      boolean;
  slowMo:       number;    // 1.0 = normal; < 1 slow-mo; lerps back to 1.0
  confusion:    number;    // countdown frames — steering inverted + chaos
  rain:         boolean;
  rainTtl:      number;
  rainDrops:    RainDrop[];
  shake:        number;    // pixel magnitude, decays per frame
  shockwaves:   Shockwave[];
  gravField:    GravField | null;
  genesisPulse: number;    // countdown for full-canvas glow flash
  sporeShift:   number;    // global hue offset applied to all creature colours
  sporeDecay:   number;    // countdown until sporeShift returns to 0
}

// ── Singleton ─────────────────────────────────────────────────────

export const env: EnvState = {
  paused:       false,
  isNight:      false,
  slowMo:       1.0,
  confusion:    0,
  rain:         false,
  rainTtl:      0,
  rainDrops:    [],
  shake:        0,
  shockwaves:   [],
  gravField:    null,
  genesisPulse: 0,
  sporeShift:   0,
  sporeDecay:   0,
};

// ── Per-frame tick ────────────────────────────────────────────────

export function tickEnv(): void {
  // Slow-mo: lerp back to 1.0
  if (env.slowMo < 1.0) env.slowMo = Math.min(1.0, env.slowMo + 0.0028);

  // Confusion countdown
  if (env.confusion > 0) env.confusion--;

  // Rain
  if (env.rain) {
    if (--env.rainTtl <= 0) { env.rain = false; env.rainDrops.length = 0; }
    else _updateRain();
  }

  // Screen shake decay
  env.shake = env.shake > 0.5 ? env.shake * 0.82 : 0;

  // Shockwave expansion
  for (let i = env.shockwaves.length - 1; i >= 0; i--) {
    env.shockwaves[i].r += 15;
    if (env.shockwaves[i].r >= env.shockwaves[i].maxR) env.shockwaves.splice(i, 1);
  }

  // Gravity / repulsor TTL
  if (env.gravField && --env.gravField.ttl <= 0) env.gravField = null;

  // Genesis flash countdown
  if (env.genesisPulse > 0) env.genesisPulse--;

  // Spore hue-shift decay
  if (env.sporeDecay > 0) {
    if (--env.sporeDecay === 0) env.sporeShift = 0;
    else env.sporeShift *= 0.991;
  }
}

// ── Visual effects layer ──────────────────────────────────────────
// Called after creatures are drawn each frame.

export function drawEnvEffects(p: p5): void {
  // Earthquake shockwave rings
  p.noFill();
  for (const sw of env.shockwaves) {
    const prog = sw.r / sw.maxR;
    p.stroke(50, 78, 82, (1 - prog) * 0.68);
    p.strokeWeight((1 - prog) * 5.5 + 0.5);
    p.ellipse(sw.x, sw.y, sw.r * 2, sw.r * 2);
  }

  // Rain streaks
  if (env.rain) {
    p.stroke(210, 55, 80, 0.32);
    p.strokeWeight(0.85);
    for (const d of env.rainDrops) {
      p.line(d.x, d.y, d.x + d.vx * d.len, d.y + d.vy * d.len);
    }
  }

  // Gravity well / repulsor concentric rings
  if (env.gravField) {
    const { x, y, attract, ttl } = env.gravField;
    const frac  = ttl / 240;
    const pulse = 0.45 + 0.55 * Math.abs(Math.sin(Date.now() * 0.0045));
    const hue   = attract ? 185 : 12;
    p.noFill();
    p.stroke(hue, 88, 68, frac * 0.55 * pulse); p.strokeWeight(1.5);
    p.ellipse(x, y,  58,  58);
    p.ellipse(x, y, 108, 108);
    p.stroke(hue, 88, 68, frac * 0.22 * pulse);
    p.ellipse(x, y, 172, 172);
  }

  // Confusion purple tint
  if (env.confusion > 0) {
    const t = Math.min(1, env.confusion / 60);
    p.noStroke(); p.fill(278, 55, 20, t * 0.09);
    p.rect(0, 0, p.width, p.height);
  }

  // Genesis full-canvas flash
  if (env.genesisPulse > 0) {
    const t = env.genesisPulse / 70;
    p.noStroke(); p.fill(155, 55, 88, t * 0.22);
    p.rect(0, 0, p.width, p.height);
  }
}

// ── Rain helpers ──────────────────────────────────────────────────

export function spawnRainDrops(): void {
  env.rainDrops.length = 0;
  for (let i = 0; i < 90; i++) {
    env.rainDrops.push({
      x: Math.random() * W(), y: Math.random() * H(),
      vx: 0.22, vy: 0.88 + Math.random() * 0.75,
      len: 7 + Math.random() * 11,
    });
  }
}

function _updateRain(): void {
  for (const d of env.rainDrops) {
    d.x += d.vx * 2.6; d.y += d.vy * 4.0;
    if (d.y > H() + 20) { d.x = Math.random() * W();  d.y = -20; }
    if (d.x > W() + 20) { d.x = -20; d.y = Math.random() * H(); }
  }
}
