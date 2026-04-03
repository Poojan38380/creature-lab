import p5 from 'p5';
import './style.css';

import { Creature } from './creature';
import { updateTrails, drawTrails } from './trails';
import { hideHint, initHint, rebuildSequence, updateHUD, updateTooltip } from './ui';
import { setNoise, setSize } from './context';
import { DNA } from './dna';

// ── State ────────────────────────────────────────────────────────

interface TypedEntry {
  char: string;
  dna: DNA;
  creature: Creature;
}

const creatures: Creature[]   = [];
const typed:     TypedEntry[] = [];

let spawnIdx     = 0;
let totalSpawned = 0;
let totalDead    = 0;
let hintVisible  = true;

// ── Helpers ──────────────────────────────────────────────────────

function spawnChar(char: string): void {
  if (hintVisible) { hideHint(); hintVisible = false; }
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
  totalDead++;
  rebuildSequence(typed);
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
    e.preventDefault(); // prevent browser back-navigation gesture
    handleBackspace();
  }
});

inputEl.addEventListener('input', (e: Event) => {
  const ie = e as InputEvent;

  if (ie.inputType === 'deleteContentBackward') {
    // Mobile backspace comes through here (key was 'Unidentified' in keydown)
    handleBackspace();
  } else if (ie.data) {
    for (const char of ie.data) spawnChar(char);
  }

  // Always clear so the input never accumulates real text
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

    initHint();
  };

  // p5's windowResized fires on orientation change / browser resize
  sk.windowResized = (): void => { syncSize(); };

  sk.draw = (): void => {
    // Soft persistence — motion-blur trail effect
    sk.fill(240, 40, 2, 0.2);
    sk.noStroke();
    sk.rect(0, 0, sk.width, sk.height);

    updateTrails(creatures);
    drawTrails(sk);

    for (let i = creatures.length - 1; i >= 0; i--) {
      const c = creatures[i];
      c.update();
      c.draw(sk);
      if (!c.alive) creatures.splice(i, 1);
    }

    if (sk.frameCount % 15 === 0) {
      updateHUD(
        creatures.filter(c => !c.dying).length,
        totalSpawned,
        totalDead,
      );
    }
  };

});
