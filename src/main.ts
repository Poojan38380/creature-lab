import p5 from 'p5';
import './style.css';

import { Creature } from './creature';
import { updateTrails, drawTrails } from './trails';
import { rebuildSequence, updateHUD, updateTooltip } from './ui';
import { setNoise, setSize } from './context';
import { DNA } from './dna';
import { SpatialGrid } from './grid';
import { applyBehaviors, SpawnRequest } from './behaviors';
import { env, tickEnv, drawEnvEffects } from './env';
import { isPunctuation, handlePunctuation } from './events';

// ── State ────────────────────────────────────────────────────────

interface TypedEntry {
  char: string;
  dna: DNA;
  creature: Creature;
}

const creatures: Creature[]   = [];
const typed:     TypedEntry[] = [];
const grid = new SpatialGrid(120);

let spawnIdx     = 0;
let totalSpawned = 0;
let totalDead    = 0;

// ── Helpers ──────────────────────────────────────────────────────

const quickGuideEl = document.getElementById('quick-guide');
const terminalEl   = document.getElementById('terminal');

function setQuickGuide(visible: boolean): void {
  quickGuideEl?.classList.toggle('hidden', !visible);
  // Pulse the terminal border to draw the user's eye when canvas is empty
  terminalEl?.classList.toggle('attract', visible);
}

function spawnChar(char: string): void {
  setQuickGuide(false);
  const c = new Creature(char, spawnIdx++);
  creatures.push(c);
  totalSpawned++;
  typed.push({ char, dna: c.dna, creature: c });
  rebuildSequence(typed);
}

function handleBackspace(): void {
  if (typed.length === 0) return;
  const last = typed.pop()!;
  last.creature.kill();
  rebuildSequence(typed);
}

/** Called by the behavior system when two creatures reproduce. */
function spawnOffspring(req: SpawnRequest): void {
  const c = new Creature(req.dna, spawnIdx++, req.x, req.y);
  creatures.push(c);
  totalSpawned++;
}

// ── Input: hidden <input> element ────────────────────────────────
// Works on both desktop (physical keyboard) and mobile (virtual keyboard).
// Strategy:
//   keydown  → Backspace only (prevents browser-back navigation)
//   input    → all printable characters via InputEvent.data
//              (reliable on mobile where keydown gives 'Unidentified')

const inputEl = document.getElementById('hidden-input') as HTMLInputElement;

inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Backspace') {
    e.preventDefault();
    handleBackspace();
  } else if (e.key === 'Enter') {
    e.preventDefault(); // prevent form submit / newline
    handlePunctuation('Enter', creatures);
  } else if (e.key === ' ') {
    e.preventDefault(); // prevent page scroll
    handlePunctuation(' ', creatures);
  }
});

inputEl.addEventListener('input', (e: Event) => {
  const ie = e as InputEvent;

  if (ie.inputType === 'deleteContentBackward') {
    handleBackspace();
  } else if (ie.inputType === 'insertLineBreak') {
    // Mobile Enter
    handlePunctuation('Enter', creatures);
  } else if (ie.data) {
    for (const char of ie.data) {
      if (isPunctuation(char)) handlePunctuation(char, creatures);
      else spawnChar(char);
    }
  }

  inputEl.value = '';
});

// ── Focus management ─────────────────────────────────────────────
// Tap/click anywhere → focus the hidden input → keyboard appears on mobile.

function focusInput(): void {
  inputEl.focus({ preventScroll: true });
}

// Auto-focus on load so desktop users can type immediately
window.addEventListener('load', focusInput);

// Re-focus on any tap or click anywhere on the page
document.addEventListener('pointerdown', focusInput);

// ── Input: mouse (tooltip + hover ring) ──────────────────────────

document.addEventListener('mousemove', (e: MouseEvent) => {
  updateTooltip(creatures, e.clientX, e.clientY);
});

// ── p5 Sketch ────────────────────────────────────────────────────

new p5((sk: p5) => {

  // Use visualViewport when available so the canvas shrinks correctly
  // when the mobile keyboard slides up, keeping creatures visible.
  function vpWidth():  number { return window.visualViewport?.width  ?? sk.windowWidth;  }
  function vpHeight(): number { return window.visualViewport?.height ?? sk.windowHeight; }

  function syncSize(): void {
    const w = vpWidth(), h = vpHeight();
    sk.resizeCanvas(w, h);
    setSize(w, h);
  }

  sk.setup = (): void => {
    const cnv = sk.createCanvas(vpWidth(), vpHeight());
    cnv.style('position', 'fixed');
    cnv.style('top', '0');
    cnv.style('left', '0');
    cnv.style('z-index', '1');
    sk.colorMode(sk.HSL, 360, 100, 100, 1);
    sk.smooth();

    setNoise((x, y, z) => sk.noise(x, y ?? 0, z ?? 0));
    setSize(sk.width, sk.height);

    // visualViewport fires when the on-screen keyboard appears/disappears
    window.visualViewport?.addEventListener('resize', syncSize);

    // Start with terminal attracting attention
    setQuickGuide(true);
  };

  // p5's windowResized fires on orientation change / browser resize
  sk.windowResized = (): void => { syncSize(); };

  sk.draw = (): void => {
    if (!env.paused) tickEnv();

    // Reset transform each frame so screen shake doesn't accumulate
    sk.resetMatrix();
    if (env.shake > 0.5) {
      sk.translate(
        (Math.random() - 0.5) * env.shake,
        (Math.random() - 0.5) * env.shake,
      );
    }

    // Soft persistence — night mode shifts background to deep indigo
    sk.noStroke();
    if (env.isNight) sk.fill(232, 55, 5, 0.2);
    else             sk.fill(240, 40, 2, 0.2);
    sk.rect(0, 0, sk.width, sk.height);

    // Ecosystem behaviours (skipped while paused)
    if (!env.paused) applyBehaviors(creatures, grid, spawnOffspring);

    updateTrails(creatures);
    drawTrails(sk);

    for (let i = creatures.length - 1; i >= 0; i--) {
      const c = creatures[i];
      if (!env.paused) c.update();
      c.draw(sk);
      if (!c.alive) {
        totalDead++;
        creatures.splice(i, 1);
      }
    }

    // Environmental effect overlays (shockwaves, rain, tints…)
    drawEnvEffects(sk);

    if (sk.frameCount % 15 === 0) {
      const living = creatures.filter(c => !c.dying).length;
      updateHUD(living, totalSpawned, totalDead);
      setQuickGuide(living === 0);
    }
  };

});
