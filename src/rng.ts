// Seeded pseudo-random number generator (xorshift32).
// Returns a function that produces deterministic floats in [0, 1).
export function makeRNG(seed: number): () => number {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return (): number => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
