import { clamp, noise1 } from './noise'

/** Width of the panorama seen from the tent, used to open the slope of its mountain. */
export const WORLD_W = 120

/** The shape of a mountain slope in the picture seen from the tent: its summit row, its base row and how far it opens. */
export type SlopeShape = {
  seed: number
  ySummit: number
  yBase: number
  /** Half width of the mountain at the base row. */
  spread?: number
}

/** Half of the width of the mountain at row `y`, on the left (-1) or right (1) side. */
export function getHalfWidth(world: SlopeShape, y: number, side: -1 | 1): number {
  const depth = Math.max(0, y - world.ySummit)
  const span = world.yBase - world.ySummit
  // a steep cone near the summit that opens into a wide wall further down
  const cone = 0.5 * depth
  const wall = (world.spread ?? WORLD_W * 0.95) * Math.sqrt(Math.min(1.6, depth / span))
  const base = Math.min(cone, wall)
  const t = clamp(depth / span, 0, 1.6)
  const wobble = (noise1(world.seed + side * 13, y * 0.05) - 0.5) * 15 + (noise1(world.seed + side * 29, y * 0.23) - 0.5) * 4.5
  return Math.max(0, base + wobble * Math.min(1, t * 4))
}
