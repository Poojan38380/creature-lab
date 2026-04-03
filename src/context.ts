// Shared runtime context — noise function and canvas dimensions.
// Using exported `let` gives importers a live binding:
// when setNoise/setSize update these, all importing modules see the new value.

export let noise: (x: number, y: number, z?: number) => number = () => 0.5;

let _w = window.innerWidth;
let _h = window.innerHeight;

export const W = (): number => _w;
export const H = (): number => _h;

export function setNoise(fn: typeof noise): void {
  noise = fn;
}

export function setSize(w: number, h: number): void {
  _w = w;
  _h = h;
}
