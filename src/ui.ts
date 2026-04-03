import { Creature } from './creature';
import { DNA } from './dna';

// ── DOM refs ─────────────────────────────────────────────────────

const seqEl   = document.getElementById('seq')!;
const caretEl = document.getElementById('caret')!;
const popEl   = document.getElementById('hpop')!;
const spawnEl = document.getElementById('hspawn')!;
const deadEl  = document.getElementById('hdead')!;
const tipEl   = document.getElementById('tooltip')!;

// ── Exported functions ────────────────────────────────────────────


export function rebuildSequence(typed: ReadonlyArray<{ char: string; dna: DNA }>): void {
  while (seqEl.firstChild) seqEl.removeChild(seqEl.firstChild);
  for (const e of typed) {
    const sp = document.createElement('span');
    sp.className  = 'ct';
    sp.textContent = e.char === ' ' ? '\u00a0' : e.char;
    sp.style.color = `hsl(${e.dna.hue}, ${e.dna.sat}%, ${e.dna.lit}%)`;
    seqEl.appendChild(sp);
  }
  seqEl.appendChild(caretEl);
}

export function updateHUD(population: number, spawned: number, dead: number): void {
  popEl.textContent   = String(population);
  spawnEl.textContent = String(spawned);
  deadEl.textContent  = String(dead);
}

export function updateTooltip(creatures: Creature[], mx: number, my: number): void {
  let closest: Creature | null = null;
  let bestDist = Infinity;

  for (const c of creatures) {
    if (!c.alive || c.dying) continue;
    const d      = c.distSq(mx, my);
    const thresh = (c.dna.size * 2.5) ** 2;
    if (d < thresh && d < bestDist) { bestDist = d; closest = c; }
  }

  for (const c of creatures) c.hovered = (c === closest);

  if (!closest) { tipEl.style.display = 'none'; return; }

  const { dna } = closest;
  tipEl.style.display     = 'block';
  tipEl.style.left        = `${mx + 18}px`;
  tipEl.style.top         = `${my - 10}px`;
  tipEl.style.borderColor = `hsl(${dna.hue}, ${dna.sat}%, ${dna.lit}%, 0.3)`;
  tipEl.innerHTML =
    `CHAR &nbsp;&nbsp;<span style="color:hsl(${dna.hue},${dna.sat}%,${dna.lit}%);font-size:16px">${dna.char}</span><br>` +
    `FAMILY &nbsp;${FAMILY_LABELS[dna.family]}<br>` +
    `AGE &nbsp;&nbsp;&nbsp;&nbsp;${closest.age} ticks<br>` +
    `SPEED &nbsp;&nbsp;${dna.speed.toFixed(2)}<br>` +
    `EYES &nbsp;&nbsp;&nbsp;${dna.numEyes}`;
}

// ── Internal ─────────────────────────────────────────────────────

const FAMILY_LABELS: Record<string, string> = {
  vowel:     'Herd Animal',
  consonant: 'Wanderer',
  apex:      'Apex Predator',
  scavenger: 'Scavenger',
  titan:     'Titan',
};
