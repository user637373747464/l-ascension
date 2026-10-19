import { clamp, pnoise1, rand } from './noise'
import { bayer, Raster, rgb, type RGB } from './pixelArt'

/**
 * Building blocks for the side-scrolling scenes. Every strip is a small raster that loops seamlessly
 * (all the noise is periodic and everything drawn past the right edge comes back on the left).
 */
export const VIEW_W = 120
export const VIEW_H = 150
/** Rows of sky added above the picture when the scene fills a tall screen. */
export const EXTRA_TOP = 130

export type Strip = {
  key: string
  src: string
  /** Width of one tile and height of the strip, in art pixels. */
  w: number
  h: number
  /** Distance between the bottom of the strip and the bottom of the picture. */
  bottom: number
  /** Seconds the strip takes to scroll by one tile; 0 = it stays still. */
  seconds: number
  opacity?: number
}

export type Tone3 = readonly [string, string, string]

export function makeStrip(key: string, w: number, h: number, bottom: number, seconds: number, paint: (r: Raster) => void, opacity?: number): Strip {
  const r = new Raster(w, h, true)
  paint(r)
  return { key, src: r.toDataURL(), w, h, bottom, seconds, opacity }
}

/**
 * The sky of a scene: painted on the usual 120 x 150 picture, then extended upwards with its top row,
 * so that a tall screen shows more sky above the landscape instead of a cropped picture.
 */
export function makeSky(paint: (r: Raster) => void, extra?: (r: Raster) => void): string {
  const base = new Raster(VIEW_W, VIEW_H)
  paint(base)
  const full = new Raster(VIEW_W, VIEW_H + EXTRA_TOP)
  full.data.set(base.data, EXTRA_TOP * VIEW_W * 4)
  const top = base.data.subarray(0, VIEW_W * 4)
  for (let y = 0; y < EXTRA_TOP; y += 1) full.data.set(top, y * VIEW_W * 4)
  extra?.(full)
  return full.toDataURL()
}

export function makeImage(w: number, h: number, paint: (r: Raster) => void): string {
  const r = new Raster(w, h)
  paint(r)
  return r.toDataURL()
}

const lerpColor = (a: RGB, b: RGB, t: number): RGB => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]

/** Vertical gradient with ordered dithering. Extra colours are inserted between the stops so that the dither stays fine. */
export function paintGradient(r: Raster, colors: readonly string[], top = 0, height = r.h) {
  const stops = colors.map(rgb)
  const palette: RGB[] = []
  stops.forEach((color, index) => {
    palette.push(color)
    if (index < stops.length - 1) for (let k = 1; k < 3; k += 1) palette.push(lerpColor(color, stops[index + 1], k / 3))
  })
  for (let y = top; y < top + height; y += 1) {
    const position = ((y - top) / Math.max(1, height - 1)) * (palette.length - 1)
    const index = Math.min(palette.length - 2, Math.floor(position))
    const fraction = position - index
    for (let x = 0; x < r.w; x += 1) r.set(x, y, palette[fraction > bayer(x, y) ? index + 1 : index])
  }
}

export function ellipse(r: Raster, cx: number, cy: number, rx: number, ry: number, pick: (dx: number, dy: number) => RGB | null) {
  for (let dy = -ry; dy <= ry; dy += 1) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.0001))))
    for (let dx = -half; dx <= half; dx += 1) {
      const color = pick(dx, dy)
      if (color) r.set(cx + dx, cy + dy, color)
    }
  }
}

/** A heavy cloud bank: overlapping puffs, lit on top and dark underneath, with a dithered shade. */
export function paintCloudBank(r: Raster, seed: number, count: number, yMin: number, yMax: number, light: string, shade: string, size = 1) {
  const lit = rgb(light)
  const dark = rgb(shade)
  for (let index = 0; index < count; index += 1) {
    const cx = Math.round(rand(seed, index, 1) * r.w)
    const cy = Math.round(yMin + rand(seed, index, 2) * (yMax - yMin))
    const width = Math.round((16 + rand(seed, index, 3) * 22) * size)
    const puffs = 3 + Math.floor(rand(seed, index, 4) * 3)
    for (let puff = 0; puff < puffs; puff += 1) {
      const px = cx + Math.round(((puff / (puffs - 1)) - 0.5) * width)
      const ry = Math.round((3 + rand(seed, index * 7 + puff, 5) * 4) * size)
      const rx = Math.round((5 + rand(seed, index * 7 + puff, 6) * 6) * size)
      const py = cy - Math.round(Math.sin((puff / (puffs - 1)) * Math.PI) * 3 * size)
      ellipse(r, px, py, rx, ry, (dx, dy) => (dy + ry * 0.2) / ry + (bayer(px + dx, py + dy) - 0.5) * 0.5 > 0.3 ? dark : lit)
    }
  }
}

type RangeOptions = {
  seed: number
  /** Height of the highest peak above the bottom of the strip. */
  amp: number
  /** Number of noise cells along the strip: more cells, more peaks. */
  cells: number
  /** 0 = rolling hills, 1 = sharp ridges. */
  sharp: number
  body: Tone3
  /** Snow colours (lit, mid, shade) and how deep the snow reaches from the crest, as a share of the peak height. */
  snow?: Tone3
  snowLine?: number
  /** A dark line along the crest. */
  outline?: string
  /** Rows kept empty at the top of the strip. */
  margin?: number
  /** A valley in a static picture: around `x`, within `width` pixels, the peaks are lowered to `factor` of their height. */
  dip?: { x: number; width: number; factor: number }
}

export function rangeHeight(o: Pick<RangeOptions, 'seed' | 'amp' | 'cells' | 'sharp' | 'dip'>, width: number) {
  // `cells` peaks spread over the strip; each one is a cone (sharp) or a dome (hills) and they merge into ridges.
  const rounding = 1 + (1 - o.sharp) * 0.9
  const peaks = Array.from({ length: o.cells }, (_, index) => ({
    x: ((index + rand(o.seed, index, 1) * 0.8) / o.cells) * width,
    h: o.amp * (0.5 + 0.5 * rand(o.seed, index, 2)),
    base: (width / o.cells) * (0.85 + rand(o.seed, index, 3) * 0.9),
  }))
  return (x: number) => {
    let best = o.amp * 0.12
    for (const peak of peaks) {
      let d = Math.abs(x - peak.x) % width
      d = Math.min(d, width - d)
      const t = Math.min(1, d / peak.base)
      best = Math.max(best, peak.h * (1 - Math.pow(t, rounding)))
    }
    const jag = (pnoise1(o.seed + 3, (x / width) * o.cells * 4, o.cells * 4) - 0.5) * o.amp * 0.16 * o.sharp
    const valley = o.dip ? 1 - (1 - o.dip.factor) * Math.max(0, 1 - Math.abs(x - o.dip.x) / o.dip.width) : 1
    return Math.max(2, (best + jag) * valley)
  }
}

/** A mountain range in profile: facets lit from the left, dithered shading, snow high up. Returns the crest height function. */
export function paintRange(r: Raster, o: RangeOptions): (x: number) => number {
  const height = rangeHeight(o, r.w)
  const body = o.body.map(rgb)
  const snow = o.snow?.map(rgb)
  const outline = o.outline ? rgb(o.outline) : null
  const margin = o.margin ?? 0
  const tops = Array.from({ length: r.w }, (_, x) => Math.round(r.h - height(x) - margin))
  for (let x = 0; x < r.w; x += 1) {
    const top = tops[x]
    const slope = height(x + 2) - height(x - 2)
    const snowDepth = snow ? (o.snowLine ?? 0.5) * o.amp * (0.55 + 0.9 * pnoise1(o.seed + 5, (x / r.w) * o.cells * 3, o.cells * 3)) : 0
    for (let y = top; y < r.h; y += 1) {
      const depth = y - top
      const u = clamp(0.5 - slope * 0.32 + (depth / Math.max(1, o.amp)) * 0.1, 0, 1)
      const tone = clamp(Math.floor(u * 3 + (bayer(x, y) - 0.5) * 0.8), 0, 2)
      let color = body[tone]
      if (snow && depth < snowDepth + (bayer(x, y) - 0.5) * 4) color = snow[tone]
      r.set(x, y, color)
    }
    if (outline) {
      // a continuous line: it also covers the steep steps between this column and the next
      const next = tops[(x + 1) % r.w]
      for (let y = Math.min(top, next) - 1; y <= top - 1; y += 1) r.set(x, y, outline)
    }
  }
  return height
}

/** Little pines along a crest, to make a forested ridge. */
export function paintCrestPines(r: Raster, seed: number, crest: (x: number) => number, dark: string, tip: string | null, spacing: number, margin = 0) {
  const body = rgb(dark)
  const white = tip ? rgb(tip) : null
  for (let x = 0; x < r.w; x += spacing) {
    const cx = x + Math.round((rand(seed, x, 1) - 0.5) * spacing)
    const base = Math.round(r.h - crest(cx) - margin) + 2
    const tall = 4 + Math.floor(rand(seed, x, 2) * 4)
    for (let row = 0; row < tall; row += 1) {
      const half = Math.min(3, Math.floor(row / 2) + (row === tall - 1 ? 1 : 0))
      for (let dx = -half; dx <= half; dx += 1) r.set(cx + dx, base - tall + row, white && row % 2 === 0 && Math.abs(dx) === half && rand(seed, x, 3) > 0.4 ? white : body)
    }
  }
}

/** Ground strip: the surface with a wavy top edge, shaded by depth, with sparkles or specks. */
export function paintGroundTile(r: Raster, seed: number, tones: Tone3, edge: string, wave: number, speck: string, specks: number) {
  const [lit, mid, shade] = tones.map(rgb)
  const edgeColor = rgb(edge)
  const speckColor = rgb(speck)
  for (let x = 0; x < r.w; x += 1) {
    const top = 2 + Math.round(wave * pnoise1(seed, (x / r.w) * 6, 6) + wave * 0.4 * pnoise1(seed + 1, (x / r.w) * 15, 15))
    r.set(x, top - 1, edgeColor)
    for (let y = top; y < r.h; y += 1) {
      const depth = (y - top) / Math.max(1, r.h - top)
      const level = depth + pnoise1(seed + 2, (x / r.w) * 8 + y * 0.35, 8) * 0.22 - 0.11 + (bayer(x, y) - 0.5) * 0.22
      r.set(x, y, level < 0.3 ? lit : level < 0.66 ? mid : shade)
    }
  }
  for (let index = 0; index < specks; index += 1) r.set(Math.floor(rand(seed, index, 11) * r.w), 6 + Math.floor(rand(seed, index, 12) * (r.h - 8)), speckColor)
}

/** Humps of snow (or ash, or sand) that pass in front of the walker's feet. */
export function paintLumps(r: Raster, seed: number, count: number, tones: Tone3, edge: string) {
  const [lit, mid, shade] = tones.map(rgb)
  const outline = rgb(edge)
  for (let index = 0; index < count; index += 1) {
    const cx = Math.round(((index + rand(seed, index, 21) * 0.8) / count) * r.w)
    const rx = 4 + Math.floor(rand(seed, index, 22) * 6)
    const ry = 2 + Math.floor(rand(seed, index, 23) * 3)
    const cy = r.h - ry - 1 - Math.floor(rand(seed, index, 24) * 2)
    ellipse(r, cx, cy, rx, ry, (_dx, dy) => (dy < -ry + 1 ? lit : dy > ry - 2 ? shade : mid))
    for (let dx = -rx; dx <= rx; dx += 1) r.set(cx + dx, cy - Math.round(ry * Math.sqrt(Math.max(0, 1 - (dx * dx) / (rx * rx)))) - 1, outline)
  }
}

/** A rock: a lumpy polygon with a lit left face, a shaded right face and a dark outline. */
export function paintRock(r: Raster, cx: number, baseY: number, w: number, h: number, tones: Tone3, outline: string, cap: Tone3 | null = null) {
  const [lit, mid, shade] = tones.map(rgb)
  const line = rgb(outline)
  const capColors = cap?.map(rgb)
  for (let dx = -Math.floor(w / 2); dx <= Math.floor(w / 2); dx += 1) {
    const t = Math.abs(dx) / (w / 2)
    const top = Math.round(baseY - h * (1 - Math.pow(t, 1.8) * 0.85) + (dx % 3 === 0 ? 1 : 0))
    for (let y = top; y <= baseY; y += 1) {
      const depth = (y - top) / Math.max(1, baseY - top)
      let tone: RGB = dx < -w * 0.1 ? lit : dx > w * 0.15 ? shade : mid
      if (depth > 0.7 && bayer(cx + dx, y) > 0.5) tone = shade
      r.set(cx + dx, y, capColors && depth < 0.25 ? capColors[dx < 0 ? 0 : 1] : tone)
    }
    r.set(cx + dx, top - 1, line)
  }
  for (let y = baseY - h; y <= baseY; y += 1) {
    const dxEdge = Math.floor(w / 2) + 1
    if (y > baseY - h * 0.3) { r.set(cx - dxEdge, y, line); r.set(cx + dxEdge, y, line) }
  }
}

/** An ice block (serac): tall, faceted, pale blue. */
export function paintSerac(r: Raster, cx: number, baseY: number, w: number, h: number, seed: number, outline: string) {
  const tones = [rgb('#f3fbff'), rgb('#c4def0'), rgb('#8fb4d4'), rgb('#6a8fb8')]
  const line = rgb(outline)
  const lean = Math.round((rand(seed, cx, 31) - 0.5) * 4)
  for (let dx = 0; dx < w; dx += 1) {
    const left = cx - Math.floor(w / 2) + dx
    const top = baseY - h + Math.round(Math.abs(dx - w * 0.4) * 0.5) + (dx % 4 === 1 ? 1 : 0)
    for (let y = top; y <= baseY; y += 1) {
      const sx = left + Math.round(((baseY - y) / h) * lean)
      const face = dx < w * 0.45 ? 0 : dx < w * 0.8 ? 1 : 2
      const tone = clamp(face + (bayer(sx, y) > 0.78 ? 1 : 0) + (y > baseY - h * 0.2 ? 1 : 0), 0, 3)
      r.set(sx, y, tones[tone])
    }
    r.set(left + Math.round(lean * 1), top - 1, line)
  }
}

export function paintSpindrift(r: Raster, seed: number, crest: (x: number) => number, margin: number, color: string, minHeight: number) {
  const white = rgb(color)
  for (let x = 2; x < r.w - 2; x += 1) {
    const here = crest(x)
    if (here < minHeight || here < crest(x - 1) || here < crest(x + 1) || here < crest(x - 2) || here < crest(x + 2)) continue
    const top = Math.round(r.h - here - margin)
    const length = 14 + Math.floor(rand(seed, x, 41) * 16)
    for (let k = 1; k <= length; k += 1) {
      const spread = 1 + Math.floor(k / 5)
      for (let dy = 0; dy < spread; dy += 1) if (bayer(x - k, top + dy) < 1 - k / length) r.set(x - k, top + dy + Math.floor(k * 0.12), white)
    }
  }
}

export function sparkle(r: Raster, seed: number, count: number, color: string, yMin: number, yMax: number) {
  const c = rgb(color)
  for (let index = 0; index < count; index += 1) r.set(Math.floor(rand(seed, index, 51) * r.w), yMin + Math.floor(rand(seed, index, 52) * (yMax - yMin)), c)
}
