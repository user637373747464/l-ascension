/** Small deterministic noise helpers: the same mountain always gets the same drawing. */
export function rand(seed: number, a: number, b = 0): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(a + 0x7f4a7c15, 0xc2b2ae35) ^ Math.imul(b + 0x165667b1, 0x27d4eb2f)
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d)
  h ^= h >>> 12
  h = Math.imul(h, 0x297a2d39)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

const smooth = (t: number) => t * t * (3 - 2 * t)

export function noise1(seed: number, x: number): number {
  const i = Math.floor(x)
  const f = smooth(x - i)
  return rand(seed, i) * (1 - f) + rand(seed, i + 1) * f
}

export function noise2(seed: number, x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = smooth(x - ix)
  const fy = smooth(y - iy)
  const top = rand(seed, ix, iy) * (1 - fx) + rand(seed, ix + 1, iy) * fx
  const bottom = rand(seed, ix, iy + 1) * (1 - fx) + rand(seed, ix + 1, iy + 1) * fx
  return top * (1 - fy) + bottom * fy
}

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
export const lerp = (a: number, b: number, t: number) => a + (a === b ? 0 : (b - a) * t)

const wrapIndex = (index: number, period: number) => ((index % period) + period) % period

/** 1-D value noise that repeats every `period` lattice cells: a strip painted with it joins up with itself when it loops. */
export function pnoise1(seed: number, x: number, period: number): number {
  const i = Math.floor(x)
  const f = smooth(x - i)
  return rand(seed, wrapIndex(i, period)) * (1 - f) + rand(seed, wrapIndex(i + 1, period)) * f
}
