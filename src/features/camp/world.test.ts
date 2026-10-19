import { describe, expect, it } from 'vitest'
import { getHalfWidth } from './world'

describe('pente de la montagne vue de la tente', () => {
  const slope = { seed: 123, ySummit: 30, yBase: 128, spread: 86 }

  it('part d’une pointe au sommet et s’élargit vers la base', () => {
    expect(getHalfWidth(slope, 30, -1)).toBe(0)
    expect(getHalfWidth(slope, 128, -1) > 30).toBe(true)
    expect(getHalfWidth(slope, 128, 1) > 30).toBe(true)
  })

  it('reste toujours positive et identique à chaque appel', () => {
    for (let y = 0; y < 160; y += 1) {
      for (const side of [-1, 1] as const) {
        const half = getHalfWidth(slope, y, side)
        expect(half >= 0).toBe(true)
        expect(half).toBe(getHalfWidth(slope, y, side))
      }
    }
  })
})
