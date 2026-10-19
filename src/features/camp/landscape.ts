import type { MountainEntry } from '../../data/mountain'

/**
 * The five landscapes of the walk. Each mountain gets one of them from its altitude, its continent and its nature:
 * - forest: snowy pine forest of the middle mountains (tropical rain forest for the equatorial summits)
 * - alpine: high mountains, glaciers and ice walls
 * - extreme: the giants (Himalaya, Karakoram, Antarctica, very high Andes): white-out, snow banners
 * - volcano: black slopes of ash, steam and glowing cracks
 * - desert: dust storm over sand and red rock (Australia, Africa, Middle East)
 */
export type LandscapeId = 'forest' | 'alpine' | 'extreme' | 'volcano' | 'desert'
export type Precipitation = 'snow' | 'rain' | 'dust' | 'ash'

export type Landscape = {
  id: LandscapeId
  name: string
  precipitation: Precipitation
  /** Tropical forest: warm rain instead of snow, green ground. */
  tropical: boolean
  /** Prayer flags strung along the path (Nepal, Tibet, India). */
  prayerFlags: boolean
  /** Share of the far peaks covered by snow (0 = bare). */
  snow: number
}

type Described = Pick<MountainEntry, 'name' | 'altitude' | 'environment' | 'country' | 'entryType'>

const HIMALAYAN = /Népal|Pakistan|Chine|Tibet|Inde/
const PRAYER_FLAGS = /Népal|Tibet|Inde|Chine/
const DRY = /Maroc|Tanzanie|Kenya|Ouganda|Éthiopie|Turquie/
const TROPICAL = /Malaisie|Papouasie|Indonésie|Guyana/

export const landscapeNames: Record<LandscapeId, string> = {
  forest: 'Forêt sous la neige',
  alpine: 'Haute montagne',
  extreme: 'Les géants glacés',
  volcano: 'Pentes volcaniques',
  desert: 'Tempête de sable',
}

export function getLandscapeId(mountain: Described): LandscapeId {
  const altitude = mountain.altitude ?? 8000
  if (mountain.environment === 'polar') return 'extreme'
  if (HIMALAYAN.test(mountain.country) && mountain.environment !== 'volcanic') return 'extreme'
  if (mountain.environment === 'volcanic') return 'volcano'
  if (altitude >= 6000) return 'extreme'
  if (mountain.environment === 'arid' || DRY.test(mountain.country)) return 'desert'
  if (altitude < 3000 || (TROPICAL.test(mountain.country) && altitude < 4800)) return 'forest'
  return 'alpine'
}

export function getLandscape(mountain: Described): Landscape {
  const id = getLandscapeId(mountain)
  const altitude = mountain.altitude ?? 8000
  const tropical = id === 'forest' && TROPICAL.test(mountain.country)
  const precipitation: Precipitation = id === 'desert' ? 'dust' : id === 'volcano' ? 'ash' : tropical ? 'rain' : 'snow'
  const snow = id === 'extreme' ? 0.8 : id === 'alpine' ? 0.62 : id === 'volcano' ? (altitude >= 4000 ? 0.3 : 0) : id === 'desert' ? (altitude >= 4000 ? 0.4 : 0) : tropical ? 0 : 0.5
  return { id, name: landscapeNames[id], precipitation, tropical, prayerFlags: PRAYER_FLAGS.test(mountain.country) && id === 'extreme', snow }
}

/** Every mountain always gets the same drawing: its seed comes from its place in the list and its name. */
export function mountainSeed(mountain: Pick<MountainEntry, 'order' | 'name'>): number {
  return mountain.order * 23 + mountain.name.length * 17
}
