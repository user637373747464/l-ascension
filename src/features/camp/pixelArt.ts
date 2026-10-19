import type { MountainEnvironment, MountainEntry } from '../../data/mountain'
import { clamp, noise1, noise2, rand } from './noise'
import { getHalfWidth, type SlopeShape } from './world'

/**
 * Procedural pixel art. Every mountain is painted once on a small canvas (one canvas pixel = one art pixel),
 * with a limited palette, ordered dithering and a dark outline, then shown with `image-rendering: pixelated`.
 */
export type RGB = readonly [number, number, number]
export const rgb = (hex: string): RGB => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]

export class Raster {
  data: Uint8ClampedArray<ArrayBuffer>
  /** `wrapX`: a pixel drawn past the right edge comes back on the left, so the strip loops seamlessly. */
  constructor(readonly w: number, readonly h: number, readonly wrapX = false) {
    this.data = new Uint8ClampedArray(w * h * 4)
  }
  set(x: number, y: number, color: RGB) {
    x = Math.round(x)
    y = Math.round(y)
    if (this.wrapX) x = ((x % this.w) + this.w) % this.w
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    const i = (y * this.w + x) * 4
    this.data[i] = color[0]
    this.data[i + 1] = color[1]
    this.data[i + 2] = color[2]
    this.data[i + 3] = 255
  }
  filled(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.data[(y * this.w + x) * 4 + 3] > 0
  }
  rect(x: number, y: number, w: number, h: number, color: RGB) {
    for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) this.set(x + i, y + j, color)
  }
  toDataURL(): string {
    const canvas = document.createElement('canvas')
    canvas.width = this.w
    canvas.height = this.h
    const context = canvas.getContext('2d')!
    context.putImageData(new ImageData(this.data, this.w, this.h), 0, 0)
    return canvas.toDataURL('image/png')
  }
}

export const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map((row) => row.map((value) => (value + 0.5) / 16))
export const bayer = (x: number, y: number) => BAYER[y & 3][x & 3]

type Palette = {
  sky: string[]
  cloud: [string, string]
  sun: [string, string]
  far: [string, string]
  rock: [string, string, string, string]
  snow: [string, string, string, string]
  outline: string
  ground: [string, string, string]
  tree: [string, string]
  /** Share of the lower slope covered by forest, and how far down from the summit the snow reaches. */
  vegetation: number
  snowDepth: number
}

const snowRock: Palette['snow'] = ['#ffffff', '#e1eefa', '#b9d3ee', '#8fb2dc']

const palettes: Record<MountainEnvironment, Palette> = {
  alpine: { sky: ['#3f86d0', '#5aa2e0', '#7dbdf0', '#a5d6f6', '#cfeafb'], cloud: ['#ffffff', '#d6e9f8'], sun: ['#fff2b0', '#ffe07a'], far: ['#8fb2d4', '#b6d1ea'], rock: ['#9bb3cc', '#7893b2', '#56739a', '#3a5580'], snow: snowRock, outline: '#17304f', ground: ['#f4f9fd', '#d8e8f5', '#b3cde6'], tree: ['#3f8a6c', '#245a4a'], vegetation: 0.45, snowDepth: 0.46 },
  volcanic: { sky: ['#8a5a8c', '#c06f7c', '#e8906e', '#f6b585', '#fbd6a4'], cloud: ['#ffe9d2', '#f2c6b0'], sun: ['#fff0c0', '#ffd27a'], far: ['#9b7285', '#b98d96'], rock: ['#9a7a72', '#755c62', '#52434f', '#352b3a'], snow: ['#f6e9dc', '#d9c4b6', '#b09a99', '#8a767e'], outline: '#2a1d2e', ground: ['#7a6568', '#5a4850', '#3e303b'], tree: ['#4f6b4a', '#2c4033'], vegetation: 0.3, snowDepth: 0.2 },
  forest: { sky: ['#5fa9b0', '#80c0b8', '#a3d6c4', '#c6e8d0', '#e3f4dc'], cloud: ['#ffffff', '#dcefe0'], sun: ['#fff6b8', '#ffe686'], far: ['#7fb09a', '#a4ccb4'], rock: ['#86ad8f', '#628d72', '#446c58', '#2c4d3f'], snow: ['#f4faf0', '#d9ead9', '#b0cdb7', '#86aa94'], outline: '#17382f', ground: ['#9ccf7e', '#6fb064', '#4a8a52'], tree: ['#3f9a58', '#1f6140'], vegetation: 0.8, snowDepth: 0.12 },
  plateau: { sky: ['#4e94cf', '#6aaee0', '#8cc6ee', '#b0dcf5', '#d4eefa'], cloud: ['#ffffff', '#dcecf6'], sun: ['#fff2b0', '#ffe07a'], far: ['#98b4c8', '#bcd2e0'], rock: ['#a8a99a', '#868a86', '#636b6f', '#454d57'], snow: snowRock, outline: '#1b2f45', ground: ['#e9eef0', '#cdd8dd', '#a9bac4'], tree: ['#58875c', '#2f5a42'], vegetation: 0.25, snowDepth: 0.34 },
  polar: { sky: ['#7fb4dc', '#9cc9e8', '#bcdcf0', '#d9ecf7', '#eef7fc'], cloud: ['#ffffff', '#e2eff9'], sun: ['#ffffff', '#fff2c4'], far: ['#b4d0e6', '#d0e4f2'], rock: ['#c4daea', '#a3c0d9', '#7f9fc2', '#5a7ca6'], snow: ['#ffffff', '#eaf4fc', '#c9dff1', '#a3c3e2'], outline: '#1f3d5e', ground: ['#fbfdff', '#e0eef8', '#c0d8ec'], tree: ['#7fa6c0', '#52789a'], vegetation: 0, snowDepth: 0.96 },
  rock: { sky: ['#6fa4c4', '#8cbad2', '#a9ccdc', '#c8dfe6', '#e2eff0'], cloud: ['#ffffff', '#dfebee'], sun: ['#fff4c0', '#ffe48a'], far: ['#98afbb', '#b9cbd4'], rock: ['#aab0b3', '#868d93', '#626c75', '#434d58'], snow: snowRock, outline: '#1d2a38', ground: ['#e7ebec', '#c9d0d4', '#a5afb6'], tree: ['#56795f', '#2f503f'], vegetation: 0.18, snowDepth: 0.3 },
  arid: { sky: ['#e0a15a', '#ecb86e', '#f4cd88', '#f9dfa8', '#fdeecb'], cloud: ['#fff6e0', '#f3dcb4'], sun: ['#fffbe0', '#ffe9a0'], far: ['#d4a16c', '#e6bd8a'], rock: ['#e0a86e', '#c4834f', '#9a5f3c', '#6d3f2c'], snow: ['#fbf1d8', '#ecd9b0', '#d1b98a', '#b09870'], outline: '#4a2a1e', ground: ['#f0d9a0', '#dcc080', '#bfa064'], tree: ['#8a9a4a', '#5a6a32'], vegetation: 0.1, snowDepth: 0.08 },
}

/** Moonlit palette of the view from the tent. */
const night: Palette = { sky: ['#09172f', '#10294d', '#1b4175', '#2f6aa3', '#6ea0cf'], cloud: ['#2a4a7d', '#1b3560'], sun: ['#fff3c4', '#ffe29a'], far: ['#2c4a7a', '#3d5f95'], rock: ['#6784ad', '#4a6590', '#324b78', '#202f58'], snow: ['#f0f7ff', '#cfe0f5', '#9fbbe3', '#7391c4'], outline: '#0a1530', ground: ['#dbe8f8', '#b4c9ea', '#8aa5d4'], tree: ['#1d4a5a', '#0f2c3f'], vegetation: 0.4, snowDepth: 0.5 }

function paintSky(r: Raster, colors: RGB[], top = 0, height = r.h) {
  for (let y = top; y < top + height; y += 1) {
    const position = ((y - top) / Math.max(1, height - 1)) * (colors.length - 1)
    const index = Math.min(colors.length - 2, Math.floor(position))
    const fraction = position - index
    for (let x = 0; x < r.w; x += 1) r.set(x, y, colors[fraction > bayer(x, y) ? index + 1 : index])
  }
}

function paintDisc(r: Raster, cx: number, cy: number, radius: number, colors: [string, string]) {
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      if (x * x + y * y <= radius * radius + 1) r.set(cx + x, cy + y, rgb(y > radius * 0.35 || x > radius * 0.55 ? colors[1] : colors[0]))
    }
  }
}

/** A ridge of distant hills in a flat colour, with a lighter row along the top. */
function paintRidge(r: Raster, seed: number, baseY: number, amplitude: number, frequency: number, colors: [string, string], offset = 0) {
  const body = rgb(colors[0])
  const crest = rgb(colors[1])
  for (let x = 0; x < r.w; x += 1) {
    const sampleX = Math.floor(x / 2) * 2
    const top = Math.round(baseY - amplitude * noise1(seed + offset, sampleX * frequency + offset))
    r.set(x, top, crest)
    for (let y = top + 1; y < r.h; y += 1) r.set(x, y, body)
  }
}

const TREE_A = ['....#....', '...###...', '..#####..', '...###...', '..#####..', '.#######.', '..#####..', '.#######.', '#########', '....b....', '....b....']

export function paintPine(r: Raster, x: number, baseY: number, palette: Pick<Palette, 'tree' | 'snow' | 'outline'>, snowy: boolean, scale = 1) {
  const light = rgb(palette.tree[0])
  const dark = rgb(palette.tree[1])
  const snow = rgb(palette.snow[0])
  const trunk = rgb('#4a3426')
  const outline = rgb(palette.outline)
  const rows = TREE_A
  const height = rows.length * scale
  const set = (px: number, py: number, color: RGB) => { for (let j = 0; j < scale; j += 1) for (let i = 0; i < scale; i += 1) r.set(px + i, py + j, color) }
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx += 1) {
      const cell = row[rx]
      if (cell === '.') continue
      const sx = x - Math.floor(row.length / 2) * scale + rx * scale
      const sy = baseY - height + ry * scale
      if (cell === 'b') set(sx, sy, trunk)
      else {
        const edgeLeft = rx === 0 || row[rx - 1] === '.'
        const tier = ry > 0 && rows[ry - 1][rx] === '.'
        set(sx, sy, snowy && tier ? snow : edgeLeft || rx < Math.floor(row.length / 2) ? light : dark)
      }
    }
  })
  // thin outline on the left and right edges
  rows.forEach((row, ry) => {
    const first = row.indexOf('#')
    if (first < 0) return
    const last = row.lastIndexOf('#')
    set(x - Math.floor(row.length / 2) * scale + (first - 1) * scale, baseY - height + ry * scale, outline)
    set(x - Math.floor(row.length / 2) * scale + (last + 1) * scale, baseY - height + ry * scale, outline)
  })
}

type MountainPaint = { world: SlopeShape & { cx: number; height: number }; palette: Palette; snowDepth: number; vegetation: number }

/** Rock and snow of one mountain: facets that fan out from the summit, lit from the left, with dithered shading. */
function paintMountain(r: Raster, { world, palette, snowDepth, vegetation }: MountainPaint) {
  const rock = palette.rock.map(rgb)
  const snow = palette.snow.map(rgb)
  const tree = palette.tree.map(rgb)
  const outline = rgb(palette.outline)
  const span = world.yBase - world.ySummit
  const snowLimit = (x: number) => snowDepth * span * (0.88 + noise1(world.seed + 7, x * 0.07) * 0.24) + (noise1(world.seed + 9, x * 0.4) - 0.5) * 9
  const forestStart = world.yBase - vegetation * span * 0.3
  const mask: boolean[][] = []
  for (let y = world.ySummit - 1; y < r.h; y += 1) {
    const left = getHalfWidth(world, y, -1)
    const right = getHalfWidth(world, y, 1)
    const xl = Math.round(world.cx - left)
    const xr = Math.round(world.cx + right)
    mask[y] = []
    for (let x = xl; x <= xr; x += 1) {
      mask[y][x] = true
      const half = x < world.cx ? left : right
      const u = half > 0 ? (x - world.cx) / half : 0
      const depth = y - world.ySummit
      const v = (u + 1) * 1.45 + (noise2(world.seed + 3, x * 0.07, y * 0.05) - 0.5) * 1.15 + (depth / span) * 0.3
      let level = clamp(Math.floor(v + (bayer(x, y) - 0.5) * 0.36), 0, 3)
      const snowy = depth < snowLimit(x)
      if (!snowy && rand(world.seed, x, y) < 0.04) level = Math.min(3, level + 1)
      let color = snowy ? snow[level] : rock[level]
      if (snowy && depth >= snowLimit(x) - 2) color = snow[Math.min(3, level + 1)]
      if (!snowy && vegetation > 0) {
        const line = forestStart + (noise1(world.seed + 11, x * 0.12) - 0.5) * 18
        const shade = (y - line) / Math.max(1, world.yBase - forestStart)
        if (shade > 0 && shade + (bayer(x, y) - 0.5) * 0.5 > 0.12) color = tree[level >= 2 || shade > 0.7 ? 1 : 0]
      }
      r.set(x, y, color)
    }
  }
  for (let y = world.ySummit - 1; y < r.h; y += 1) {
    for (let x = 0; x < r.w; x += 1) {
      if (mask[y]?.[x]) continue
      if (mask[y]?.[x - 1] || mask[y]?.[x + 1] || mask[y - 1]?.[x] || mask[y + 1]?.[x]) r.set(x, y, outline)
    }
  }
}

function paintGround(r: Raster, world: Pick<SlopeShape, 'seed'>, palette: Palette, top: number) {
  const [lit, mid, shade] = palette.ground.map(rgb)
  const outline = rgb(palette.outline)
  for (let x = 0; x < r.w; x += 1) {
    const edge = top + Math.round((noise1(world.seed + 17, x * 0.09) - 0.5) * 7)
    for (let y = edge; y < r.h; y += 1) {
      const depth = (y - edge) / Math.max(1, r.h - edge)
      const wave = noise2(world.seed + 19, x * 0.08, y * 0.4) * 0.3
      const level = depth + wave + (bayer(x, y) - 0.5) * 0.2
      r.set(x, y, level < 0.34 ? lit : level < 0.68 ? mid : shade)
    }
    r.set(x, edge - 1, outline)
  }
}

export const PANORAMA = { width: 240, height: 160 }
const panoramaCache = new Map<string, string>()

/** What the explorer sees from the tent at night: the summit of the current expedition, stars and moon. */
export function renderPanorama(mountain: Pick<MountainEntry, 'order' | 'name' | 'altitude' | 'environment'>): string {
  const key = `${mountain.order}:${mountain.name}`
  const cached = panoramaCache.get(key)
  if (cached) return cached
  const seed = mountainSeed(mountain)
  const r = new Raster(PANORAMA.width, PANORAMA.height)
  const palette = night
  paintSky(r, palette.sky.map(rgb))
  // a warm glow low on the horizon, as on a real winter dusk
  for (let y = 96; y < 112; y += 1) for (let x = 0; x < r.w; x += 1) if ((y - 96) / 16 > bayer(x, y) + 0.1) r.set(x, y, rgb('#f2a77a'))
  for (let index = 0; index < 90; index += 1) {
    const x = Math.floor(rand(seed, index, 61) * r.w)
    const y = Math.floor(rand(seed, index, 62) * 84)
    r.set(x, y, rgb(rand(seed, index, 63) > 0.8 ? '#ffe9a8' : '#e8f1ff'))
  }
  paintDisc(r, 188, 30, 6, palette.sun)
  paintRidge(r, seed + 5, 92, 30, 0.04, palette.far, 3)
  const world = { seed, cx: 150 + Math.round((rand(seed, 3) - 0.5) * 8), ySummit: 30 + Math.round(clamp(mountain.altitude ?? 4000, 0, 8849) / -700), yBase: 128, spread: 86, height: PANORAMA.height }
  paintMountain(r, { world, palette, snowDepth: clamp(palettes[mountain.environment].snowDepth + 0.25, 0.3, 0.95), vegetation: 0.3 })
  paintGround(r, world, palette, 122)
  for (let index = 0; index < 7; index += 1) paintPine(r, 104 + Math.round(rand(seed, index, 71) * 100), 133 + Math.round(rand(seed, index, 72) * 6), palette, true, 1)
  const url = r.toDataURL()
  panoramaCache.set(key, url)
  return url
}

function mountainSeed(mountain: Pick<MountainEntry, 'order' | 'name'>): number {
  return mountain.order * 23 + mountain.name.length * 17
}

