import { env, spawnRainDrops } from './env';
import { Creature } from './creature';
import { W, H } from './context';

/** Set of characters that trigger environmental events instead of spawning a creature. */
const PUNCT_SET = new Set(['.', '!', '?', ',', ';', ':', '(', ')']);

export function isPunctuation(key: string): boolean {
  return PUNCT_SET.has(key) || key === 'Enter' || key === ' ';
}

/**
 * Dispatch a punctuation key to its environmental event.
 * Mutates `env` and/or creature state as needed.
 */
export function handlePunctuation(key: string, creatures: Creature[]): void {
  switch (key) {

    case '.': {   // ── Day / Night toggle ──────────────────────────
      env.isNight = !env.isNight;
      break;
    }

    case '!': {   // ── Earthquake ──────────────────────────────────
      env.shake = 24;
      env.shockwaves.push({
        x: W() * 0.5, y: H() * 0.5,
        r: 10, maxR: Math.hypot(W(), H()) * 0.70,
      });
      for (const c of creatures) {
        if (!c.dying) c.targetH = Math.random() * Math.PI * 2;
      }
      break;
    }

    case '?': {   // ── Confusion field ─────────────────────────────
      env.confusion = 300;   // 5 s at 60fps
      break;
    }

    case ',': {   // ── Rain ────────────────────────────────────────
      env.rain    = true;
      env.rainTtl = 480;     // 8 s
      spawnRainDrops();
      break;
    }

    case ';': {   // ── Spore cloud — global hue mutation ───────────
      env.sporeShift = (Math.random() < 0.5 ? 1 : -1) * (28 + Math.random() * 52);
      env.sporeDecay = 260;
      break;
    }

    case ':': {   // ── Freeze frame (slow-motion) ───────────────────
      env.slowMo = 0.20;
      break;
    }

    case '(': {   // ── Gravity well ────────────────────────────────
      env.gravField = { x: W() * 0.5, y: H() * 0.5, attract: true,  ttl: 240 };
      break;
    }

    case ')': {   // ── Repulsor ─────────────────────────────────────
      env.gravField = { x: W() * 0.5, y: H() * 0.5, attract: false, ttl: 240 };
      break;
    }

    case 'Enter': {  // ── Genesis ───────────────────────────────────
      env.genesisPulse = 70;
      for (const c of creatures) {
        if (!c.dying) {
          c.energy  = Math.min(1.0, c.energy + 0.35);
          c.reproCD = 0;   // unlock reproduction for all pairs immediately
        }
      }
      break;
    }

    case ' ': {   // ── Pause / Resume ──────────────────────────────
      env.paused = !env.paused;
      const el = document.getElementById('pause-overlay');
      if (el) el.style.display = env.paused ? 'flex' : 'none';
      break;
    }
  }
}
