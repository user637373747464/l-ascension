import type { MountainEntry } from '../../data/mountain'
import { ellipse, EXTRA_TOP, makeSky, makeStrip, paintCloudBank, paintCrestPines, paintGradient, paintGroundTile, paintLumps, paintRange, paintRock, paintSerac, paintSpindrift, sparkle, VIEW_H, VIEW_W, type Strip, type Tone3 } from './artKit'
import { getLandscape, mountainSeed, type Landscape } from './landscape'
import { bayer, paintPine, rgb, type Raster } from './pixelArt'
import { pnoise1, rand } from './noise'

/**
 * The walk: a side view, the explorer trudging to the right while the landscape scrolls to the left.
 * Everything loops every 20 seconds. Strips are listed from the back to the front.
 */
export const RUN = { width: VIEW_W, height: VIEW_H, loop: 20, feetY: 133, walkerX: 40 }

export type Weather = {
  /** Colour of the flakes (or drops, grains, ash). */
  tones: [string, string]
  /** Dark storm tint laid over the picture at the heart of the loop, and the colour of the white-out veil. */
  storm: string
  veil: string
  lightning: boolean
  embers: boolean
  /** Share of the horizon glow (volcano). */
  glow: string | null
  /** The explorer's breath is only visible in the cold. */
  breath: boolean
}

export type RunArt = {
  landscape: Landscape
  sky: string
  behind: Strip[]
  front: Strip[]
  veils: Strip[]
  weather: Weather
  /** The colour of the footprints left in the ground. */
  print: string
}

const cache = new Map<string, RunArt>()

type Described = Pick<MountainEntry, 'order' | 'name' | 'altitude' | 'environment' | 'country' | 'entryType'>

// y of the bottom of each band, counted from the top of the picture
const bottomOf = (y: number) => VIEW_H - y

export function renderRunArt(mountain: Described): RunArt {
  const key = `${mountain.order}:${mountain.name}`
  const cached = cache.get(key)
  if (cached) return cached
  const landscape = getLandscape(mountain)
  const seed = mountainSeed(mountain)
  const painter = painters[landscape.id]
  const art = painter(landscape, seed, mountain)
  cache.set(key, art)
  return art
}

type Painter = (landscape: Landscape, seed: number, mountain: Described) => RunArt

function veilStrips(seed: number, color: string, density: number): Strip[] {
  const paintVeil = (width: number, rows: number, offset: number) => (r: Raster) => {
    const white = rgb(color)
    for (let y = 0; y < rows; y += 1) {
      const band = Math.sin((y / rows) * Math.PI)
      for (let x = 0; x < width; x += 1) {
        const cloud = pnoise1(seed + offset, (x / width) * 9 + y * 0.12, 9)
        if (cloud * band * density > 0.5 + bayer(x, y) * 0.5 - 0.2) r.set(x, y, white)
      }
    }
  }
  return [
    makeStrip('veil-a', 120, 64, bottomOf(122), 10, paintVeil(120, 64, 61), 0.4),
    makeStrip('veil-b', 240, 56, bottomOf(114), 20, paintVeil(240, 56, 83), 0.3),
  ]
}

/** Prayer flags strung between two poles, for the passes of Nepal and Tibet. */
function paintPrayerFlags(r: Raster, seed: number) {
  const pole = rgb('#3b2a1e')
  const colors = ['#2f6fd0', '#ffffff', '#d83a3a', '#2f9a52', '#f2c230'].map(rgb)
  const x1 = 40 + Math.floor(rand(seed, 1) * 40)
  const x2 = x1 + 74
  const top = 60
  for (let y = top; y < r.h - 4; y += 1) { r.set(x1, y, pole); r.set(x2, y, pole) }
  for (let x = x1; x <= x2; x += 1) {
    const sag = Math.round(Math.sin(((x - x1) / (x2 - x1)) * Math.PI) * 7)
    r.set(x, top + 2 + sag, rgb('#e8e0d0'))
    if ((x - x1) % 3 === 0 && x - x1 < 72) {
      const color = colors[Math.floor((x - x1) / 3) % 5]
      for (let dy = 0; dy < 5; dy += 1) for (let dx = 0; dx < 2; dx += 1) r.set(x + dx, top + 3 + sag + dy + (dx === 1 && (x - x1) % 2 === 0 ? 1 : 0), color)
    }
  }
}

// ── forest ────────────────────────────────────────────────────────────────────

const forest: Painter = (landscape, seed) => {
  const wet = landscape.tropical
  const sky = makeSky((r) => {
    paintGradient(r, wet ? ['#455a58', '#607670', '#87a094', '#b0c7b8', '#d8e6d4'] : ['#3d4d63', '#586a80', '#7f93a8', '#aabccb', '#d2dde6'], 0, 112)
    paintGradient(r, wet ? ['#d8e6d4', '#a9c0a0'] : ['#d2dde6', '#e9f0f5'], 112, VIEW_H - 112)
  })
  const clouds = makeStrip('clouds', 200, 56, bottomOf(62), 20, (r) => paintCloudBank(r, seed + 3, 9, 10, 46, wet ? '#9bb0a6' : '#a3b3c4', wet ? '#667d74' : '#6e8197', 1.3))
  const far = makeStrip('far', 120, 64, bottomOf(112), 20, (r) => {
    paintRange(r, { seed: seed + 11, amp: 44, cells: 5, sharp: 0.45, body: wet ? ['#8fae9d', '#7a9a8a', '#688a7a'] : ['#a2b6ca', '#8da3bb', '#788fab'], snow: wet ? undefined : ['#f1f7fb', '#d6e4ef', '#bacddf'], snowLine: 0.5 })
  })
  const mid = makeStrip('mid', 160, 56, bottomOf(116), 20, (r) => {
    const crest = paintRange(r, { seed: seed + 21, amp: 34, cells: 6, sharp: 0.2, body: wet ? ['#4f7a62', '#406a54', '#325744'] : ['#4d6f72', '#3d5d63', '#2f4c54'] })
    paintCrestPines(r, seed + 22, crest, wet ? '#2f5a46' : '#2c4a52', wet ? null : '#dbe8f0', 3)
  })
  const near = makeStrip('near', 280, 44, bottomOf(114), 20, (r) => {
    const palette = { tree: wet ? ['#4a9a60', '#2a6a42'] as [string, string] : ['#3f6e66', '#244a46'] as [string, string], snow: ['#ffffff', '#e8f1f8', '#bcd0e4', '#9ab3cc'] as [string, string, string, string], outline: wet ? '#17382a' : '#173a3a' }
    for (let index = 0; index < 9; index += 1) {
      const x = Math.round((index / 9) * r.w + (rand(seed, index, 61) - 0.3) * 16)
      paintPine(r, x, r.h - 2 + Math.round(rand(seed, index, 62) * 3), palette, !wet, rand(seed, index, 63) > 0.45 ? 2 : 1)
    }
  })
  const groundTones: Tone3 = wet ? ['#a2bd78', '#7f9b5c', '#5b7845'] : ['#f6fafd', '#d8e6f2', '#b6cde3']
  const ground = makeStrip('ground', 120, 44, 0, 5, (r) => paintGroundTile(r, seed + 31, groundTones, wet ? '#3f5a35' : '#8fa8c3', 3, wet ? '#5c4a35' : '#ffffff', 26))
  const lumps = makeStrip('lumps', 120, 12, bottomOf(137), 5, (r) => paintLumps(r, seed + 33, 7, wet ? ['#b5cf88', '#86a262', '#617f4a'] : ['#ffffff', '#e3eef8', '#b8cfe5'], wet ? '#3f5a35' : '#8fa8c3'))
  const front = makeStrip('front', 360, 44, 0, 10, (r) => {
    const rock: Tone3 = wet ? ['#7d8a78', '#5f6e5c', '#46543f'] : ['#9fb0c2', '#7a8ea5', '#5a6e86']
    for (let index = 0; index < 4; index += 1) {
      const x = Math.round(30 + index * 88 + rand(seed, index, 71) * 30)
      if (index % 2 === 0) paintRock(r, x, r.h - 3, 12 + Math.floor(rand(seed, index, 72) * 8), 8 + Math.floor(rand(seed, index, 73) * 6), rock, '#1e2f3d', wet ? null : ['#ffffff', '#dbe8f4', '#b8cde2'])
      else paintPine(r, x, r.h, { tree: wet ? ['#3f8a56', '#235c3a'] : ['#365f5a', '#1f403d'], snow: ['#ffffff', '#e8f1f8', '#bcd0e4', '#9ab3cc'], outline: '#173a3a' }, !wet, 1)
    }
    // a trail marker: a pole striped red and white
    const poleX = 340
    for (let y = 8; y < r.h - 2; y += 1) r.set(poleX, y, rgb(Math.floor(y / 3) % 2 === 0 ? '#d83a3a' : '#ffffff'))
  })
  return {
    landscape, sky, behind: [clouds, far, mid, near, ground], front: [lumps, front], veils: veilStrips(seed, wet ? '#dfeade' : '#eef5fa', 1.15),
    weather: { tones: wet ? ['#cfe4f4', '#9fc3de'] : ['#ffffff', '#cfe6fb'], storm: wet ? '#0f2a24' : '#0b1830', veil: wet ? '#dfeade' : '#eef5fa', lightning: true, embers: false, glow: null, breath: !wet },
    print: wet ? '#4f6a3e' : '#9db6d0',
  }
}

// ── alpine ────────────────────────────────────────────────────────────────────

const alpine: Painter = (landscape, seed) => {
  const sky = makeSky((r) => {
    paintGradient(r, ['#202f46', '#35506e', '#5878a0', '#8aa5c2', '#bfd0df'], 0, 112)
    paintGradient(r, ['#bfd0df', '#e6eff6'], 112, VIEW_H - 112)
  })
  const clouds = makeStrip('clouds', 200, 56, bottomOf(62), 20, (r) => paintCloudBank(r, seed + 3, 8, 10, 44, '#8fa5bd', '#566d89', 1.3))
  const far = makeStrip('far', 120, 78, bottomOf(112), 20, (r) => {
    const crest = paintRange(r, { seed: seed + 11, amp: 70, cells: 6, sharp: 0.85, body: ['#a9bdd6', '#8fa6c3', '#7890b0'], snow: ['#f6fafe', '#dae8f5', '#bed3e9'], snowLine: 0.5 })
    paintSpindrift(r, seed + 12, crest, 0, '#f4f9ff', 44)
  })
  const mid = makeStrip('mid', 160, 72, bottomOf(116), 20, (r) => {
    paintRange(r, { seed: seed + 21, amp: 62, cells: 4, sharp: 0.9, body: ['#7a8fa9', '#566e8e', '#3d5473'], snow: ['#f4f9ff', '#d3e3f3', '#a1bcd9'], snowLine: 0.5, outline: '#1a2c47' })
  })
  const near = makeStrip('near', 280, 44, bottomOf(114), 20, (r) => {
    for (let index = 0; index < 8; index += 1) {
      const x = Math.round((index / 8) * r.w + rand(seed, index, 61) * 20)
      const h = 10 + Math.floor(rand(seed, index, 62) * 14)
      if (index % 3 === 1) paintSerac(r, x, r.h - 1, 9 + Math.floor(rand(seed, index, 63) * 6), h + 6, seed + index, '#2c4768')
      else paintRock(r, x, r.h - 1, 16 + Math.floor(rand(seed, index, 64) * 12), h, ['#8196ad', '#617792', '#485d78'], '#1d304a', ['#ffffff', '#dbe8f4', '#b3c9e0'])
    }
  })
  const ground = makeStrip('ground', 120, 44, 0, 5, (r) => {
    paintGroundTile(r, seed + 31, ['#f7fbff', '#d9e8f6', '#b1cae4'], '#6f8db3', 3, '#ffffff', 22)
    // crevasse cracks in the ice
    const crack = rgb('#4a6a94')
    for (let index = 0; index < 3; index += 1) {
      let x = Math.floor(rand(seed, index, 81) * r.w)
      const y = 22 + Math.floor(rand(seed, index, 82) * 18)
      for (let k = 0; k < 9; k += 1) { r.set(x + k, y + (k % 3 === 0 ? 1 : 0), crack); if (k % 2 === 0) r.set(x + k, y + 2, rgb('#8fb0d4')) }
      x += 3
    }
  })
  const lumps = makeStrip('lumps', 120, 12, bottomOf(137), 5, (r) => paintLumps(r, seed + 33, 7, ['#ffffff', '#e0edf8', '#b5cde6'], '#6f8db3'))
  const front = makeStrip('front', 360, 44, 0, 10, (r) => {
    for (let index = 0; index < 4; index += 1) {
      const x = Math.round(36 + index * 86 + rand(seed, index, 71) * 24)
      paintRock(r, x, r.h - 2, 14 + Math.floor(rand(seed, index, 72) * 10), 8 + Math.floor(rand(seed, index, 73) * 8), ['#7a8ea6', '#5c718c', '#445873'], '#1b2c44', ['#ffffff', '#dce9f5', '#b6cce2'])
    }
    // an ice axe planted in the snow
    const x = 330
    for (let y = 14; y < r.h - 2; y += 1) r.set(x, y, rgb('#6b4a2e'))
    for (let k = -3; k <= 3; k += 1) r.set(x + k, 13 + Math.abs(k) / 2, rgb('#c4d4e4'))
  })
  return {
    landscape, sky, behind: [clouds, far, mid, near, ground], front: [lumps, front], veils: veilStrips(seed, '#e8f1f9', 1.1),
    weather: { tones: ['#ffffff', '#cfe6fb'], storm: '#08142a', veil: '#e8f1f9', lightning: true, embers: false, glow: null, breath: true },
    print: '#8aa6c6',
  }
}

// ── extreme ───────────────────────────────────────────────────────────────────

const extreme: Painter = (landscape, seed) => {
  const sky = makeSky((r) => {
    paintGradient(r, ['#0c1630', '#18285a', '#2e4a88', '#5d80b6', '#a9c0de'], 0, 112)
    paintGradient(r, ['#a9c0de', '#e0eaf5'], 112, VIEW_H - 112)
    sparkle(r, seed + 5, 30, '#dfe9ff', 2, 40)
  }, (full) => sparkle(full, seed + 6, 40, '#dfe9ff', 0, EXTRA_TOP + 20))
  const clouds = makeStrip('clouds', 200, 56, bottomOf(62), 20, (r) => paintCloudBank(r, seed + 3, 6, 18, 48, '#c6d4e6', '#7f98bd', 1.2))
  const far = makeStrip('far', 120, 82, bottomOf(112), 20, (r) => {
    const crest = paintRange(r, { seed: seed + 11, amp: 74, cells: 5, sharp: 0.95, body: ['#aabcdb', '#8fa6cd', '#7790ba'], snow: ['#ffffff', '#e6effb', '#cbdcf1'], snowLine: 0.55 })
    paintSpindrift(r, seed + 12, crest, 0, '#ffffff', 40)
  })
  const mid = makeStrip('mid', 160, 76, bottomOf(116), 20, (r) => {
    const crest = paintRange(r, { seed: seed + 21, amp: 68, cells: 4, sharp: 0.95, body: ['#6f87ad', '#506a92', '#38507a'], snow: ['#fbfdff', '#dbe8f8', '#a9c0e2'], snowLine: 0.5, outline: '#182c58' })
    paintSpindrift(r, seed + 22, crest, 0, '#ffffff', 46)
  })
  const near = makeStrip('near', 280, 44, bottomOf(114), 20, (r) => {
    for (let index = 0; index < 8; index += 1) {
      const x = Math.round((index / 8) * r.w + rand(seed, index, 61) * 22)
      if (index % 2 === 0) paintSerac(r, x, r.h - 1, 10 + Math.floor(rand(seed, index, 63) * 7), 14 + Math.floor(rand(seed, index, 62) * 16), seed + index, '#24406a')
      else paintRock(r, x, r.h - 1, 18 + Math.floor(rand(seed, index, 64) * 12), 10 + Math.floor(rand(seed, index, 65) * 10), ['#7f94b3', '#5f759a', '#465b80'], '#1b2c4d', ['#ffffff', '#dce9f8', '#b3c9e6'])
    }
  })
  const ground = makeStrip('ground', 120, 44, 0, 5, (r) => {
    paintGroundTile(r, seed + 31, ['#f8fbff', '#dbe8f8', '#b4cbe9'], '#6c8bb8', 3, '#ffffff', 26)
    // wind-carved ripples in the snow
    const ripple = rgb('#ffffff')
    for (let index = 0; index < 14; index += 1) {
      const x = Math.floor(rand(seed, index, 91) * r.w)
      const y = 8 + Math.floor(rand(seed, index, 92) * 32)
      for (let k = 0; k < 5; k += 1) r.set(x + k, y + Math.floor(k / 3), ripple)
    }
  })
  const lumps = makeStrip('lumps', 120, 12, bottomOf(137), 5, (r) => paintLumps(r, seed + 33, 7, ['#ffffff', '#e2edf9', '#b8cdea'], '#6c8bb8'))
  const front = makeStrip('front', 360, 64, 0, 10, (r) => {
    for (let index = 0; index < 4; index += 1) {
      const x = Math.round(30 + index * 90 + rand(seed, index, 71) * 24)
      if (index === 1) paintSerac(r, x, r.h - 2, 12, 18, seed + index, '#24406a')
      else paintRock(r, x, r.h - 2, 14 + Math.floor(rand(seed, index, 72) * 10), 8 + Math.floor(rand(seed, index, 73) * 8), ['#7a8fb0', '#5c7298', '#445a80'], '#1b2c4d', ['#ffffff', '#dce9f8', '#b3c9e6'])
    }
    if (landscape.prayerFlags) paintPrayerFlags(r, seed)
  })
  return {
    landscape, sky, behind: [clouds, far, mid, near, ground], front: [lumps, front], veils: veilStrips(seed, '#f2f7fd', 1.35),
    weather: { tones: ['#ffffff', '#d9e8fb'], storm: '#050c22', veil: '#f2f7fd', lightning: false, embers: false, glow: null, breath: true },
    print: '#8aa6cc',
  }
}

// ── volcano ───────────────────────────────────────────────────────────────────

const volcano: Painter = (landscape, seed) => {
  const snowy = landscape.snow > 0
  const sky = makeSky((r) => {
    paintGradient(r, ['#150f1f', '#2b1b2e', '#51303a', '#8e4e3a', '#d98340'], 0, 112)
    paintGradient(r, ['#d98340', '#8a4a38'], 112, VIEW_H - 112)
  })
  const clouds = makeStrip('clouds', 200, 56, bottomOf(62), 20, (r) => paintCloudBank(r, seed + 3, 8, 10, 46, '#6a5058', '#2f2230', 1.35))
  const far = makeStrip('far', 120, 64, bottomOf(112), 20, (r) => {
    const crest = paintRange(r, { seed: seed + 11, amp: 52, cells: 3, sharp: 0.55, body: ['#5a3d48', '#47303b', '#33232f'] })
    // glowing craters and plumes of smoke leaning with the wind
    const glow = rgb('#ffa23c')
    const smoke = [rgb('#7a6670'), rgb('#4a3a45')]
    for (let x = 3; x < r.w - 3; x += 1) {
      const here = crest(x)
      if (here < 30 || here < crest(x - 2) || here < crest(x + 2)) continue
      const top = Math.round(r.h - here)
      r.set(x, top, glow); r.set(x - 1, top + 1, glow); r.set(x + 1, top + 1, rgb('#ff6a1f'))
      for (let k = 1; k < 34; k += 1) {
        const spread = 1 + Math.floor(k / 4)
        for (let dy = -spread; dy <= spread; dy += 1) if (bayer(x - k * 0.4 + dy, top - k) < 1 - k / 34) r.set(x - Math.round(k * 0.45) + dy, top - k, smoke[(k + dy) % 2 === 0 ? 0 : 1])
      }
    }
  })
  const mid = makeStrip('mid', 160, 56, bottomOf(116), 20, (r) => {
    paintRange(r, { seed: seed + 21, amp: 44, cells: 5, sharp: 0.6, body: ['#4c3844', '#3a2a36', '#2b1f29'], snow: snowy ? ['#f7efe8', '#d8c9c8', '#a8979c'] : undefined, snowLine: 0.4, outline: '#150f19' })
  })
  const near = makeStrip('near', 280, 44, bottomOf(114), 20, (r) => {
    for (let index = 0; index < 9; index += 1) {
      const x = Math.round((index / 9) * r.w + rand(seed, index, 61) * 20)
      paintRock(r, x, r.h - 1, 14 + Math.floor(rand(seed, index, 62) * 14), 8 + Math.floor(rand(seed, index, 63) * 14), ['#5b4651', '#43343f', '#2e222c'], '#120d16')
      // lava glowing in the cracks
      if (index % 2 === 0) for (let k = 0; k < 6; k += 1) r.set(x - 2 + k, r.h - 5 - (k % 2), rgb(k % 3 === 0 ? '#ffc24a' : '#ff7a24'))
    }
    // steam vents
    const steam = [rgb('#d9d2d6'), rgb('#a69aa2')]
    for (let vent = 0; vent < 3; vent += 1) {
      const x = Math.round(30 + vent * 95 + rand(seed, vent, 65) * 20)
      for (let k = 0; k < 20; k += 1) for (let dx = -Math.floor(k / 5) - 1; dx <= Math.floor(k / 5) + 1; dx += 1) if (bayer(x + dx, k) < 1 - k / 20) r.set(x + dx - Math.floor(k / 6), r.h - 4 - k, steam[(dx + k) % 2 === 0 ? 0 : 1])
    }
  })
  const ground = makeStrip('ground', 120, 44, 0, 5, (r) => {
    paintGroundTile(r, seed + 31, ['#54454d', '#40343c', '#2b222b'], '#150f19', 3, '#7d6a72', 30)
    for (let index = 0; index < 4; index += 1) {
      const x = Math.floor(rand(seed, index, 81) * (r.w - 12))
      const y = 14 + Math.floor(rand(seed, index, 82) * 22)
      for (let k = 0; k < 10; k += 1) { r.set(x + k, y + (k % 4 < 2 ? 0 : 1), rgb(k % 4 === 0 ? '#ffd058' : '#ff7a24')); r.set(x + k, y + 2, rgb('#8a2a14')) }
    }
    if (snowy) for (let index = 0; index < 6; index += 1) ellipse(r, Math.floor(rand(seed, index, 83) * r.w), 20 + Math.floor(rand(seed, index, 84) * 20), 4, 1, () => rgb('#eee5e2'))
  })
  const lumps = makeStrip('lumps', 120, 12, bottomOf(137), 5, (r) => paintLumps(r, seed + 33, 7, ['#6a5a62', '#4a3b44', '#2b222b'], '#150f19'))
  const front = makeStrip('front', 360, 44, 0, 10, (r) => {
    for (let index = 0; index < 4; index += 1) {
      const x = Math.round(36 + index * 88 + rand(seed, index, 71) * 24)
      paintRock(r, x, r.h - 2, 14 + Math.floor(rand(seed, index, 72) * 10), 9 + Math.floor(rand(seed, index, 73) * 9), ['#4d3b46', '#372a34', '#251b24'], '#0f0a12')
    }
  })
  return {
    landscape, sky, behind: [clouds, far, mid, near, ground], front: [lumps, front], veils: veilStrips(seed, '#8a7a82', 0.9),
    weather: { tones: ['#9a8c92', '#6a5a62'], storm: '#1a0a10', veil: '#8a7a82', lightning: true, embers: true, glow: '#ff7a24', breath: false },
    print: '#1c151c',
  }
}

// ── desert ────────────────────────────────────────────────────────────────────

function paintMesa(r: Raster, x: number, w: number, h: number, seed: number, tones: Tone3, outline: string) {
  const [lit, mid, shade] = tones.map(rgb)
  const line = rgb(outline)
  for (let dx = 0; dx < w; dx += 1) {
    const slant = dx < 3 ? 3 - dx : dx > w - 4 ? dx - (w - 4) : 0
    const top = r.h - h + slant
    for (let y = top; y < r.h; y += 1) {
      const stripe = (y + Math.floor(rand(seed, dx >> 2, 3) * 4)) % 7 === 0
      const side = dx < w * 0.35 ? lit : dx > w * 0.7 ? shade : mid
      r.set(x + dx, y, stripe && bayer(x + dx, y) > 0.3 ? shade : side)
    }
    r.set(x + dx, top - 1, line)
  }
}

const desert: Painter = (landscape, seed, mountain) => {
  const sky = makeSky((r) => {
    paintGradient(r, ['#7d4030', '#a95a3a', '#cf8650', '#e8ab72', '#f4cf9c'], 0, 112)
    paintGradient(r, ['#f4cf9c', '#f2d8ae'], 112, VIEW_H - 112)
    ellipse(r, 84, 96, 9, 9, (dx, dy) => (dx * dx + dy * dy < 36 ? rgb('#fff1c4') : bayer(dx + 84, dy + 96) > 0.5 ? rgb('#ffdc94') : null))
  })
  const clouds = makeStrip('clouds', 200, 56, bottomOf(62), 20, (r) => paintCloudBank(r, seed + 3, 8, 12, 48, '#e6b27c', '#b5764c', 1.4))
  const far = makeStrip('far', 120, 64, bottomOf(112), 20, (r) => {
    paintRange(r, { seed: seed + 11, amp: 40, cells: 4, sharp: 0.5, body: ['#d39868', '#be8056', '#a66a48'], snow: landscape.snow > 0 ? ['#fdf3e2', '#ecd9bf', '#d3bda3'] : undefined, snowLine: 0.4 })
  })
  const isUluru = mountain.name === 'Uluru'
  const mid = makeStrip('mid', 160, 56, bottomOf(116), 20, (r) => {
    const tones: Tone3 = ['#e08650', '#bd6540', '#8f4630']
    if (isUluru) {
      ellipse(r, 80, r.h, 58, 34, (dx, dy) => (dx < -20 ? rgb(tones[0]) : dx > 24 ? rgb(tones[2]) : (dy + dx * 0.15 > 8 && bayer(dx, dy) > 0.4 ? rgb(tones[2]) : rgb(tones[1]))))
    } else {
      paintMesa(r, 14, 38, 38, seed + 1, tones, '#4a2418')
      paintMesa(r, 78, 26, 26, seed + 2, tones, '#4a2418')
      paintMesa(r, 124, 22, 18, seed + 3, tones, '#4a2418')
    }
  })
  const near = makeStrip('near', 280, 44, bottomOf(114), 20, (r) => {
    const trunk = rgb('#4a3422')
    const canopy = [rgb('#7d8a3c'), rgb('#4f6126')]
    for (let index = 0; index < 5; index += 1) {
      const x = Math.round((index / 5) * r.w + 20 + rand(seed, index, 61) * 24)
      const high = 16 + Math.floor(rand(seed, index, 62) * 8)
      for (let y = 0; y < high; y += 1) r.set(x + Math.floor(Math.sin(y * 0.4) * 1.2), r.h - 1 - y, trunk)
      ellipse(r, x, r.h - high - 1, 11, 3, (dx, dy) => canopy[dy > 0 || bayer(dx, dy) > 0.6 ? 1 : 0])
    }
    for (let index = 0; index < 8; index += 1) {
      const x = Math.round(rand(seed, index, 66) * r.w)
      ellipse(r, x, r.h - 3, 5, 3, (_dx, dy) => (dy < 0 ? rgb('#a39a4c') : rgb('#6f6a34')))
    }
  })
  const ground = makeStrip('ground', 120, 44, 0, 5, (r) => {
    paintGroundTile(r, seed + 31, ['#f6d79a', '#dcb676', '#bb9358'], '#8a5a34', 3, '#fff0c6', 24)
    const ripple = rgb('#fff0c6')
    for (let index = 0; index < 16; index += 1) {
      const x = Math.floor(rand(seed, index, 91) * r.w)
      const y = 8 + Math.floor(rand(seed, index, 92) * 32)
      for (let k = 0; k < 6; k += 1) r.set(x + k, y + (k % 3 === 2 ? 1 : 0), ripple)
    }
  })
  const lumps = makeStrip('lumps', 120, 12, bottomOf(137), 5, (r) => paintLumps(r, seed + 33, 7, ['#fbe3a8', '#e0bd7c', '#bb9358'], '#8a5a34'))
  const front = makeStrip('front', 360, 44, 0, 10, (r) => {
    for (let index = 0; index < 4; index += 1) {
      const x = Math.round(34 + index * 88 + rand(seed, index, 71) * 24)
      if (index % 2 === 0) paintRock(r, x, r.h - 2, 12 + Math.floor(rand(seed, index, 72) * 10), 7 + Math.floor(rand(seed, index, 73) * 7), ['#c47a4e', '#a05f3c', '#7a4630'], '#3c1e14')
      else for (let blade = -5; blade <= 5; blade += 1) for (let y = 0; y < 8 - Math.abs(blade); y += 1) r.set(x + blade + Math.round(y * blade * 0.12), r.h - 2 - y, rgb(y > 4 ? '#c9b85a' : '#8f8a3a'))
    }
  })
  return {
    landscape, sky, behind: [clouds, far, mid, near, ground], front: [lumps, front], veils: veilStrips(seed, '#f0c48a', 1.4),
    weather: { tones: ['#f6d79a', '#d9a463'], storm: '#4a1d0c', veil: '#f0c48a', lightning: false, embers: false, glow: null, breath: false },
    print: '#a67d46',
  }
}

const painters: Record<Landscape['id'], Painter> = { forest, alpine, extreme, volcano, desert }

