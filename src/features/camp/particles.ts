import { EXTRA_TOP, VIEW_H, VIEW_W } from './artKit'
import type { Landscape } from './landscape'
import { rand } from './noise'
import type { Weather } from './runArt'

/**
 * Snow, rain, dust and ash. A layer is a pattern of `w` x `p` art pixels repeated over the picture; it slides left by
 * `w` and falls by `p` every `seconds`, so after one turn it looks exactly as it did at the start and the loop is seamless.
 */
export type ParticleLayer = {
  key: string
  w: number
  p: number
  seconds: number
  dir: 1 | -1
  size: [number, number]
  gust: boolean
  shadows: string
}

type Spec = { key: string; w: number; p: number; seconds: number; flakes: number; size: [number, number]; tones?: string[]; dir?: 1 | -1; gust?: boolean }

function build(spec: Spec, tones: string[], seed: number): ParticleLayer {
  const shadows: string[] = []
  const copiesX = Math.ceil(VIEW_W / spec.w) + 1
  // the layer also covers the extra sky shown above the picture on a tall screen
  const lastRow = Math.ceil((VIEW_H + EXTRA_TOP) / spec.p)
  const palette = spec.tones ?? tones
  for (let index = 0; index < spec.flakes; index += 1) {
    const x = Math.floor(rand(seed, index, spec.w + spec.p) * spec.w)
    const y = Math.floor(rand(seed + 1, index, spec.w * 3 + spec.p) * spec.p)
    const color = palette[rand(seed + 2, index, spec.p) > 0.72 ? 1 : 0] ?? palette[0]
    for (let copy = 0; copy < copiesX; copy += 1) {
      for (let row = -1; row <= lastRow; row += 1) shadows.push(`calc(var(--px) * ${x + copy * spec.w}) calc(var(--px) * ${y + row * spec.p}) 0 0 ${color}`)
    }
  }
  return { key: spec.key, w: spec.w, p: spec.p, seconds: spec.seconds, dir: spec.dir ?? 1, size: spec.size, gust: Boolean(spec.gust), shadows: shadows.join(',') }
}

export function getParticleLayers(landscape: Landscape, weather: Weather, seed: number): ParticleLayer[] {
  const tones = [...weather.tones]
  const heavy = landscape.id === 'extreme' ? 1.5 : 1
  const count = (value: number) => Math.max(1, Math.round(value * heavy))
  const specs: Spec[] =
    landscape.precipitation === 'snow' ? [
      { key: 'snow-far', w: 120, p: 50, seconds: 10, flakes: count(7), size: [1, 1] },
      { key: 'snow-mid', w: 120, p: 50, seconds: 5, flakes: count(6), size: [1, 1] },
      { key: 'snow-near', w: 120, p: 60, seconds: 2.5, flakes: count(4), size: [2, 1] },
      { key: 'snow-gust', w: 120, p: 75, seconds: 2, flakes: count(9), size: [5, 1], gust: true },
    ] : landscape.precipitation === 'rain' ? [
      { key: 'rain-a', w: 60, p: 150, seconds: 2, flakes: 6, size: [1, 3] },
      { key: 'rain-b', w: 60, p: 150, seconds: 1, flakes: 4, size: [1, 4] },
      { key: 'rain-gust', w: 120, p: 150, seconds: 1, flakes: 6, size: [1, 5], gust: true },
    ] : landscape.precipitation === 'dust' ? [
      { key: 'dust-far', w: 120, p: 30, seconds: 5, flakes: 5, size: [3, 1] },
      { key: 'dust-mid', w: 120, p: 30, seconds: 2.5, flakes: 4, size: [5, 1] },
      { key: 'dust-near', w: 120, p: 40, seconds: 2, flakes: 4, size: [8, 1] },
      { key: 'dust-gust', w: 120, p: 30, seconds: 1, flakes: 5, size: [12, 1], gust: true },
    ] : [
      { key: 'ash-far', w: 120, p: 50, seconds: 10, flakes: 7, size: [1, 1] },
      { key: 'ash-mid', w: 120, p: 50, seconds: 5, flakes: 5, size: [2, 2] },
      { key: 'ash-gust', w: 120, p: 75, seconds: 2, flakes: 5, size: [4, 1], gust: true },
      { key: 'embers', w: 120, p: 75, seconds: 10, flakes: 5, size: [1, 1], dir: -1, tones: ['#ffb347', '#ff6a1f'] },
    ]
  return specs.map((spec, index) => build(spec, tones, seed + index * 17))
}
