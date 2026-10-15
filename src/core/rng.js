/** Deterministic PRNG; combat gameplay is reproducible given identical input frames. */
export function createRng(seed = 1) {
  let state = Number(seed) >>> 0;
  if (!state) state = 0x9e3779b9;
  return function next() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
export const clamp = (x, low, high) => Math.max(low, Math.min(high, x));
export const distanceSquared = (a, b) => (a.x-b.x)**2+(a.y-b.y)**2;
export const length = (x, y) => Math.hypot(x, y);
