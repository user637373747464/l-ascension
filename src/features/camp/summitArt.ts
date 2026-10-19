import type { MountainEntry } from '../../data/mountain'
import { ellipse, EXTRA_TOP, makeImage, makeSky, makeStrip, paintGradient, paintRange, VIEW_H, VIEW_W, type Strip, type Tone3 } from './artKit'
import { getLandscapeId, mountainSeed, type LandscapeId } from './landscape'
import { bayer, rgb, type Raster } from './pixelArt'
import { clamp, pnoise1, rand } from './noise'

/**
 * The summit: dawn over a sea of clouds. The explorer stands on the top of the mountain, the clouds drift slowly below,
 * far peaks stick out of them, the sun comes up. Three dawns (cold, warm, soft) are chosen from the landscape of the walk.
 */
export const SUMMIT = {
  /** Row of the top of the rock (where the explorer stands) and its left/right limits, in art pixels. */
  groundY: 117,
  manX: 64,
  /** The picture rises by this many art pixels during the arrival. */
  rise: 36,
}

const SUN = { x: 26, y: 93 }

type Dawn = {
  sky: string[]
  star: string
  sun: [string, string, string]
  peaksFar: { body: Tone3; snow: Tone3 }
  peaksNear: { body: Tone3; snow: Tone3 }
  seaFar: readonly [string, string, string, string]
  seaMid: readonly [string, string, string, string]
  seaFront: readonly [string, string, string, string]
  rock: Tone3
  rockSnow: Tone3
  outline: string
}

const COLD: Dawn = {
  sky: ['#0a1433', '#15286a', '#2f4a9a', '#7a79c4', '#e79bbd', '#ffc9a8', '#ffe3bd'],
  star: '#e9eeff',
  sun: ['#fff8dc', '#ffe08a', '#ffc7a0'],
  peaksFar: { body: ['#c59bc0', '#9a86b8', '#6f66a2'], snow: ['#fff1f4', '#ebcde2', '#b4a6d6'] },
  peaksNear: { body: ['#9a7aa8', '#665c92', '#403d70'], snow: ['#fff3ec', '#e0bdd8', '#a094cc'] },
  seaFar: ['#ffcfb0', '#eba4b8', '#b985b2', '#7d68a6'],
  seaMid: ['#ffe2c8', '#f6bcc4', '#c796b8', '#8c75ae'],
  seaFront: ['#fffaf0', '#fbe0e2', '#cdb6dc', '#9487c4'],
  rock: ['#b3939a', '#76627f', '#42394f'],
  rockSnow: ['#fff6ea', '#e9cddb', '#aa9ccf'],
  outline: '#1e1830',
}

const WARM: Dawn = {
  sky: ['#1a1033', '#3d2060', '#8a3a78', '#d9577a', '#ff8a54', '#ffc070', '#ffe5a0'],
  star: '#ffe9d0',
  sun: ['#fffbe0', '#ffe27a', '#ffb060'],
  peaksFar: { body: ['#e09a94', '#ae6f90', '#7a5688'], snow: ['#fff0dc', '#f4c9bc', '#bc94c4'] },
  peaksNear: { body: ['#b06f82', '#774e84', '#4a3768'], snow: ['#ffe9d0', '#ebb8b2', '#a480bc'] },
  seaFar: ['#ffb98a', '#ee8a8c', '#b0638e', '#76508f'],
  seaMid: ['#ffd2a2', '#f6a38c', '#c47a94', '#865b95'],
  seaFront: ['#fff0cf', '#fcd2b8', '#d3a0b4', '#9a7ca8'],
  rock: ['#bb8a80', '#80596f', '#483651'],
  rockSnow: ['#fff1dc', '#f0cabc', '#b698c4'],
  outline: '#26162e',
}

const SOFT: Dawn = {
  sky: ['#101f48', '#27417f', '#566fb6', '#a98cc4', '#f2a9aa', '#ffd2a8', '#fff0c8'],
  star: '#eef2ff',
  sun: ['#fffadf', '#ffe496', '#ffcaa4'],
  peaksFar: { body: ['#aab3d2', '#7c88b6', '#56609a'], snow: ['#fff4f4', '#e6d0e2', '#b0a8d8'] },
  peaksNear: { body: ['#7e8cb4', '#566594', '#38436f'], snow: ['#fff6f0', '#dcc4da', '#9c98cc'] },
  seaFar: ['#ffd8bc', '#eeb0bc', '#b890b6', '#7a6ea8'],
  seaMid: ['#ffe8d2', '#f8c8c8', '#c7a0bc', '#8a7bb0'],
  seaFront: ['#fffcf4', '#fce8e6', '#cfbfe0', '#9690c6'],
  rock: ['#a79aa0', '#6f6a82', '#3f3d55'],
  rockSnow: ['#fffaf0', '#ecd6e0', '#aaa2d2'],
  outline: '#1c1a30',
}

const dawns: Record<LandscapeId, Dawn> = { alpine: COLD, extreme: COLD, forest: SOFT, desert: WARM, volcano: WARM }

export type SummitImage = { key: string; src: string; x: number; y: number; w: number; h: number }

export type SummitArt = {
  sky: string
  stars: { x: number; y: number }[]
  sun: SummitImage
  peaks: SummitImage[]
  seaBack: Strip[]
  seaFront: Strip
  rock: SummitImage
  flagA: SummitImage
  flagB: SummitImage
}

const cache = new Map<string, SummitArt>()

type Described = Pick<MountainEntry, 'order' | 'name' | 'altitude' | 'environment' | 'country' | 'entryType'>

/** A sea of clouds: rounded billows, lit on the top (towards the sun, on the left), shaded underneath, dithered between. */
function paintSea(r: Raster, seed: number, tones: readonly string[], top: number, puffs: number, rx: [number, number], ry: [number, number]) {
  const [rim, lit, mid, shade] = tones.map(rgb)
  // the body below the billows, so that nothing shows through
  for (let x = 0; x < r.w; x += 1) {
    for (let y = top + ry[1] + 2; y < r.h; y += 1) r.set(x, y, bayer(x, y) < (y - top) / (r.h - top) * 0.9 - 0.1 ? shade : mid)
  }
  const list = Array.from({ length: puffs }, (_, index) => ({
    cx: Math.round(((index + rand(seed, index, 1) * 0.7) / puffs) * r.w),
    cy: top + ry[1] + Math.round(rand(seed, index, 2) * 7),
    rx: Math.round(rx[0] + rand(seed, index, 3) * (rx[1] - rx[0])),
    ry: Math.round(ry[0] + rand(seed, index, 4) * (ry[1] - ry[0])),
  })).sort((a, b) => a.cy - b.cy)
  for (const puff of list) {
    ellipse(r, puff.cx, puff.cy, puff.rx, puff.ry, (dx, dy) => {
      const u = (dy + puff.ry) / (2 * puff.ry) + (bayer(puff.cx + dx, puff.cy + dy) - 0.5) * 0.3
      return u < 0.17 ? rim : u < 0.5 ? lit : u < 0.82 ? mid : shade
    })
  }
}

function paintSun(r: Raster, colors: readonly string[]) {
  const [core, edge, halo] = colors.map(rgb)
  const c = r.w / 2
  for (let y = 0; y < r.h; y += 1) {
    for (let x = 0; x < r.w; x += 1) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c)
      if (d <= 6.5) r.set(x, y, core)
      else if (d <= 8) r.set(x, y, edge)
      else if (d < c) {
        const t = (d - 8) / (c - 8)
        if (bayer(x, y) < Math.pow(1 - t, 2) * 0.6) r.set(x, y, halo)
      }
    }
  }
}

/** The top of the mountain: a pointed block of rock and snow seen from the front, lit on the left, widening downwards into the clouds. */
const ROCK = { x: 0, y: 108, w: VIEW_W, h: VIEW_H - 108, row: SUMMIT.groundY - 108, left: 52, right: 78 }

function paintRock(r: Raster, seed: number, dawn: Dawn) {
  const [lit, mid, shade] = dawn.rock.map(rgb)
  const [snowLit, snowMid, snowShade] = dawn.rockSnow.map(rgb)
  const line = rgb(dawn.outline)
  const tops = Array.from({ length: r.w }, (_, x) => {
    const jag = Math.round((pnoise1(seed + 9, (x / r.w) * 18, 18) - 0.5) * 5)
    if (x >= ROCK.left && x <= ROCK.right) return ROCK.row + (x % 7 === 3 ? 1 : 0)
    if (x < ROCK.left) return ROCK.row + Math.max(0, Math.round((ROCK.left - x) * 1.05) + jag)
    return ROCK.row + Math.max(0, Math.round((x - ROCK.right) * 0.9) + jag)
  })
  // the ridge that runs down the middle of the face: lit on its left, in the shade on its right
  const ridge = (y: number) => 64 + (pnoise1(seed + 4, y / 5, 12) - 0.5) * 8 + (y - ROCK.row) * 0.12
  for (let x = 0; x < r.w; x += 1) {
    const top = tops[x]
    const onTop = x >= ROCK.left && x <= ROCK.right
    for (let y = top; y < r.h; y += 1) {
      const depth = y - top
      const u = clamp(0.5 + (x - ridge(y)) / 18 + (bayer(x, y) - 0.5) * 0.35, 0, 1)
      let color = u < 0.36 ? lit : u < 0.66 ? mid : shade
      // couloirs: dark streaks that follow the slope, and strata
      if ((x + Math.floor(y / 5) * 3) % 13 === 0 && depth > 5) color = color === lit ? mid : shade
      if (y > r.h - 14 && bayer(x, y) < (y - (r.h - 14)) / 14) color = u < 0.5 ? mid : shade
      const snowDepth = (onTop ? 5 : Math.max(0, 6 - Math.abs(x < ROCK.left ? ROCK.left - x : x - ROCK.right) * 0.16)) + (u > 0.6 ? -1 : 0)
      if (depth < snowDepth + (bayer(x, y) - 0.5) * 3) color = u < 0.36 ? snowLit : u < 0.66 ? snowMid : snowShade
      r.set(x, y, color)
    }
    for (let y = Math.min(top, tops[(x + 1) % r.w]) - 1; y <= top - 1; y += 1) r.set(x, y, line)
  }
  // the shadow of the explorer (the sun is on the left) and his tracks in the snow
  ellipse(r, SUMMIT.manX + 5, ROCK.row, 9, 1, () => snowShade)
  for (const [x, y] of [[56, 1], [59, 2], [72, 1], [75, 2]]) r.set(x, ROCK.row + y, snowShade)
  // a little cairn
  const stones: [number, number, number, number][] = [[56, ROCK.row - 1, 4, 2], [56, ROCK.row - 4, 3, 2], [56, ROCK.row - 6, 2, 1]]
  stones.forEach(([cx, cy, rx, ry], index) => {
    ellipse(r, cx, cy, rx, ry, (dx, dy) => (dy < 0 ? (dx < 0 ? snowLit : lit) : dx > 0 ? shade : mid))
    for (let dx = -rx; dx <= rx; dx += 1) r.set(cx + dx, cy - ry - 1 + (index === 2 ? 0 : 1), line)
  })
}

const FLAG = { x: 79, w: 16, h: 30 }

function paintFlag(r: Raster, phase: number) {
  const pole = rgb('#4a3a3a')
  const gold = rgb('#ffd36b')
  const tones = [rgb('#ffb15a'), rgb('#f0862b'), rgb('#f0862b'), rgb('#f0862b'), rgb('#d86a2a'), rgb('#b8582a')]
  r.rect(1, 2, 1, r.h - 2, pole)
  r.rect(0, 0, 3, 2, gold)
  for (let x = 2; x < 15; x += 1) {
    const wave = Math.round(Math.sin(x * 0.75 + phase * Math.PI) * 1.1)
    const taper = x > 11 ? x - 11 : 0
    for (let row = 0; row < 6 + (taper > 0 ? 0 : 1) - taper; row += 1) r.set(x, 3 + wave + row, tones[Math.min(row, tones.length - 1)])
  }
}

export function renderSummitArt(mountain: Described): SummitArt {
  const key = `${mountain.order}:${mountain.name}`
  const cached = cache.get(key)
  if (cached) return cached
  const seed = mountainSeed(mountain)
  const dawn = dawns[getLandscapeId(mountain)]
  const stars = Array.from({ length: 22 }, (_, index) => ({ x: Math.floor(rand(seed, index, 61) * (VIEW_W - 2)) + 1, y: 3 + Math.floor(rand(seed, index, 62) * 42) }))
  const starColor = rgb(dawn.star)
  const sky = makeSky((r) => {
    paintGradient(r, dawn.sky, 0, 112)
    r.rect(0, 112, VIEW_W, VIEW_H - 112, rgb(dawn.sky[dawn.sky.length - 1]))
    // the first three stars twinkle (they are separate elements), the others are fixed
    stars.forEach((star, index) => {
      if (index >= 3) r.set(star.x, star.y, starColor)
    })
  }, (full) => {
    // more stars in the extra sky above, thinning out towards the dawn
    for (let index = 0; index < 46; index += 1) full.set(Math.floor(rand(seed, index, 64) * VIEW_W), Math.floor(rand(seed, index, 65) * (EXTRA_TOP + 40)), starColor)
  })
  const sun: SummitImage = { key: 'sun', src: makeImage(44, 44, (r) => paintSun(r, dawn.sun)), x: SUN.x - 22, y: SUN.y - 22, w: 44, h: 44 }
  const farPeaks = makeImage(VIEW_W, 46, (r) => paintRange(r, { seed: seed + 3, amp: 26, cells: 6, sharp: 0.85, body: dawn.peaksFar.body, snow: dawn.peaksFar.snow, snowLine: 0.55, dip: { x: SUN.x, width: 30, factor: 0.2 } }))
  const nearPeaks = makeImage(VIEW_W, 48, (r) => paintRange(r, { seed: seed + 8, amp: 36, cells: 4, sharp: 0.95, body: dawn.peaksNear.body, snow: dawn.peaksNear.snow, snowLine: 0.5, dip: { x: SUN.x, width: 34, factor: 0.15 } }))
  const peaks: SummitImage[] = [
    { key: 'peaks-far', src: farPeaks, x: 0, y: 112 - 46, w: VIEW_W, h: 46 },
    { key: 'peaks-near', src: nearPeaks, x: 0, y: 114 - 48, w: VIEW_W, h: 48 },
  ]
  // The strips reach below the bottom of the picture so that nothing shows when the scene rises.
  const bottomOf = (y: number, h: number) => VIEW_H - (y + h)
  const seaBack = [
    makeStrip('sea-far', 120, 60, bottomOf(98, 60), 60, (r) => paintSea(r, seed + 11, dawn.seaFar, 0, 9, [8, 14], [4, 7])),
    makeStrip('sea-mid', 160, 56, bottomOf(106, 56), 40, (r) => paintSea(r, seed + 12, dawn.seaMid, 0, 9, [10, 18], [5, 9])),
  ]
  const seaFront = makeStrip('sea-front', 200, 36, bottomOf(129, 36), 25, (r) => paintSea(r, seed + 13, dawn.seaFront, 0, 8, [14, 26], [7, 11]))
  const rock: SummitImage = { key: 'rock', src: makeImage(ROCK.w, ROCK.h, (r) => paintRock(r, seed, dawn)), x: ROCK.x, y: ROCK.y, w: ROCK.w, h: ROCK.h }
  const flagTop = SUMMIT.groundY - FLAG.h + 1
  const flagA: SummitImage = { key: 'flag-a', src: makeImage(FLAG.w, FLAG.h, (r) => paintFlag(r, 0)), x: FLAG.x, y: flagTop, w: FLAG.w, h: FLAG.h }
  const flagB: SummitImage = { key: 'flag-b', src: makeImage(FLAG.w, FLAG.h, (r) => paintFlag(r, 1)), x: FLAG.x, y: flagTop, w: FLAG.w, h: FLAG.h }
  const art: SummitArt = { sky, stars: stars.slice(0, 3), sun, peaks, seaBack, seaFront, rock, flagA, flagB }
  cache.set(key, art)
  return art
}

