import { Creature } from './creature';

/**
 * Uniform spatial hash grid.
 * Rebuilds each frame; gives O(1) neighbour queries for behaviour steering.
 */
export class SpatialGrid {
  private readonly cells = new Map<number, Creature[]>();
  private readonly cs: number; // cell size in pixels

  constructor(cellSize: number) { this.cs = cellSize; }

  rebuild(creatures: Creature[]): void {
    this.cells.clear();
    for (const c of creatures) {
      if (!c.alive || c.dying) continue;
      const key = this._key(Math.floor(c.x / this.cs), Math.floor(c.y / this.cs));
      let cell = this.cells.get(key);
      if (!cell) { cell = []; this.cells.set(key, cell); }
      cell.push(c);
    }
  }

  /** Returns all creatures whose grid cell is within `radius` px of (x, y). */
  getNearby(x: number, y: number, radius: number): Creature[] {
    const result: Creature[] = [];
    const r  = Math.ceil(radius / this.cs);
    const cx = Math.floor(x / this.cs);
    const cy = Math.floor(y / this.cs);
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const cell = this.cells.get(this._key(cx + dx, cy + dy));
        if (cell) for (const c of cell) result.push(c);
      }
    }
    return result;
  }

  /** 32-bit hash from two 16-bit cell coordinates. */
  private _key(cx: number, cy: number): number {
    return ((cx & 0x7fff) | ((cy & 0x7fff) << 15)) >>> 0;
  }
}
