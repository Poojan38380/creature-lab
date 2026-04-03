import p5 from 'p5';
import { Creature } from './creature';

const TRAIL_LEN = 12;

interface Point { x: number; y: number; }
const _map = new Map<Creature, Point[]>();

export function updateTrails(creatures: Creature[]): void {
  for (const c of creatures) {
    if (c.dying || !c.alive) { _map.delete(c); continue; }
    if (!_map.has(c)) _map.set(c, []);
    const trail = _map.get(c)!;
    trail.push({ x: c.x, y: c.y });
    if (trail.length > TRAIL_LEN) trail.shift();
  }
  // Remove entries for creatures no longer in the list
  for (const [c] of _map) {
    if (!creatures.includes(c)) _map.delete(c);
  }
}

export function drawTrails(p: p5): void {
  p.noFill();
  for (const [c, trail] of _map) {
    if (trail.length < 2) continue;
    for (let i = 1; i < trail.length; i++) {
      const ratio = i / trail.length;
      p.stroke(c.dna.hue, c.dna.sat, c.dna.lit, ratio * 0.16);
      p.strokeWeight(c.dna.size * 0.2 * ratio);
      p.line(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y);
    }
  }
}
