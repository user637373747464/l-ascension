import { mountainSourceRows } from './mountain-source'

export type MountainEnvironment = 'alpine' | 'volcanic' | 'forest' | 'plateau' | 'polar' | 'rock' | 'arid'
export type MountainEntry = {
  id: string
  order: number
  name: string
  sourceLabel: string
  entryType: 'mountain' | 'route'
  altitude: number | null
  altitudeLabel: string | null
  country: string
  environment: MountainEnvironment
  routeName: string | null
  baseName: string | null
  sourceUrl: string | null
  verified: boolean
  virtualDurationMinutes: number
}

const countries = [
  'Australie','Royaume-Uni','États-Unis','États-Unis','Australie','Grèce','Espagne','Maroc','La Réunion, France','Guyana / Venezuela / Brésil',
  'Tanzanie','Papouasie-Nouvelle-Guinée','Japon','Espagne (Tenerife)','Malaisie','La Réunion, France','États-Unis (Hawaï)','États-Unis (Hawaï)','Canada','États-Unis',
  'Ouganda / République démocratique du Congo','Kenya','Éthiopie','Cameroun','États-Unis','États-Unis','États-Unis','États-Unis','États-Unis','Mexique',
  'Mexique','Iran','Turquie','Géorgie / Russie','Italie','France','France','Suisse','Suisse / Italie','Suisse',
  'Nouvelle-Zélande','Suisse / Italie','France / Italie','France / Italie','Suisse / Italie','Suisse','Russie','États-Unis / Canada','Canada','Russie',
  'Équateur','Équateur','Bolivie / Chili','Bolivie','Bolivie','Colombie','Pérou','Pérou','Argentine / Chili','Argentine / Chili',
  'Antarctique','Antarctique','Antarctique','Antarctique','Indonésie','Chili / Argentine','Colombie','Chili / Argentine','Mexique','États-Unis',
  'Grèce','Chine / Tibet','Népal','Népal','Népal','Népal / Chine','Chine','Pakistan / Chine','Pakistan / Chine','Pakistan / Chine',
  'Pakistan / Chine','Népal / Chine','Népal / Chine','Népal','Népal','Népal / Inde','Népal / Chine','Pakistan / Chine','Pakistan','Népal',
  'Népal / Chine','Népal / Chine','Pakistan','Népal','Népal / Inde','Népal / Chine','Népal / Chine','Népal / Chine','Pakistan','Pakistan','Pakistan',
]

const environments: MountainEnvironment[] = [
  'alpine','alpine','alpine','alpine','arid','alpine','alpine','alpine','volcanic','plateau',
  'alpine','alpine','volcanic','volcanic','alpine','volcanic','volcanic','volcanic','alpine','alpine',
  'alpine','alpine','alpine','volcanic','alpine','alpine','alpine','alpine','alpine','volcanic',
  'alpine','volcanic','alpine','alpine','alpine','alpine','alpine','alpine','alpine','alpine',
  'alpine','alpine','alpine','alpine','alpine','alpine','alpine','alpine','alpine','volcanic',
  'volcanic','volcanic','volcanic','alpine','alpine','volcanic','alpine','alpine','rock','rock',
  'polar','polar','polar','polar','alpine','volcanic','alpine','volcanic','volcanic','volcanic',
  'alpine','plateau','alpine','alpine','alpine','alpine','alpine','alpine','alpine','alpine',
  'alpine','alpine','alpine','alpine','alpine','alpine','alpine','alpine','alpine','alpine',
  'alpine','alpine','alpine','alpine','alpine','alpine','alpine','alpine','alpine','alpine',
]

const kosciuszkoSource = 'https://www.nationalparks.nsw.gov.au/things-to-do/walking-tracks/kosciuszko-walk-thredbo-to-mount-kosciuszko'
const countryOverrides: Record<number, string> = {
  81: 'Népal / Chine', 85: 'Népal / Inde', 86: 'Népal / Chine', 87: 'Pakistan / Chine', 88: 'Pakistan',
  89: 'Népal', 92: 'Pakistan / Chine', 93: 'Pakistan', 94: 'Népal', 95: 'Népal / Inde', 98: 'Pakistan / Chine',
}

/**
 * The climbing rate: the explorer gains one metre of altitude for every 5 seconds of work (12 m per minute, 720 m per hour).
 * The time needed for a summit follows directly from its height: Ben Nevis takes under 2 hours, Everest about 12 hours.
 */
export const SECONDS_PER_METER = 5

/** Metres to climb and the time they take, in minutes. */
export function getClimbMeters(altitude: number | null): number {
  return Math.max(1, Math.round(altitude ?? 8000))
}

export function getVirtualDurationMinutes(altitude: number | null): number {
  return (getClimbMeters(altitude) * SECONDS_PER_METER) / 60
}

/** "6 h", "12 h 30", "29 min" : a duration in minutes written for the interface. */
export function formatHours(minutes: number): string {
  const total = Math.round(minutes)
  const hours = Math.floor(total / 60)
  const rest = total % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`
}

const baseMountains: MountainEntry[] = mountainSourceRows.map((sourceLabel, index) => {
  const [rawName, rawDetails = ''] = sourceLabel.split(' — ')
  const routeEntry = rawDetails.startsWith('voie d’ascension')
  const match = rawDetails.match(/([\d\s]+)\s*m/)
  const altitude = match ? Number(match[1].replace(/\s/g, '')) : null
  return {
    id: `mountain-${String(index + 1).padStart(3, '0')}`,
    order: index + 1,
    name: rawName,
    sourceLabel,
    entryType: routeEntry ? 'route' : 'mountain',
    altitude,
    altitudeLabel: altitude ? rawDetails.match(/^(environ\s+)?[\d\s]+m/)?.[0]?.replace(/\s*m$/, ' m') ?? `${altitude.toLocaleString('fr-FR')} m` : null,
    country: countryOverrides[index + 1] ?? countries[index] ?? 'Pays non renseigné',
    environment: environments[index] ?? 'alpine',
    routeName: index === 0 ? 'Kosciuszko Walk · Thredbo → Rawson Pass → sommet' : routeEntry ? rawName : null,
    baseName: index === 0 ? 'Départ du sentier · station supérieure du Kosciuszko Express' : null,
    sourceUrl: index === 0 ? kosciuszkoSource : null,
    verified: index === 0,
    virtualDurationMinutes: 0,
  }
})

export const mountains: MountainEntry[] = baseMountains.map((entry) => {
  // A named route (Everest, west ridge…) climbs to the summit of its mountain: it takes its altitude.
  const parent = entry.entryType === 'route' ? baseMountains.find((item) => item.entryType === 'mountain' && item.altitude !== null && entry.name.startsWith(`${item.name},`)) : undefined
  return { ...entry, virtualDurationMinutes: getVirtualDurationMinutes(parent ? parent.altitude : entry.altitude) }
})

export const startingMountain = mountains[0]
export const MOUNTAIN_STORAGE_KEY = 'ascension.mountain.active.v1'

export function loadSelectedMountainId(storage?: Pick<Storage, 'getItem'>): string {
  try {
    const target = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage)
    const saved = target?.getItem(MOUNTAIN_STORAGE_KEY)
    return mountains.some((mountain) => mountain.id === saved) ? saved! : startingMountain.id
  } catch {
    return startingMountain.id
  }
}

export function saveSelectedMountainId(id: string, storage?: Pick<Storage, 'setItem'>): boolean {
  if (!mountains.some((mountain) => mountain.id === id)) return false
  try {
    const target = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage)
    if (!target) return false
    target.setItem(MOUNTAIN_STORAGE_KEY, id)
    return true
  } catch {
    return false
  }
}

export function getMountainWeather(mountain: MountainEntry, now = new Date()) {
  const options: Record<MountainEnvironment, readonly string[]> = {
    alpine: ['Neige légère', 'Couvert', 'Éclaircies', 'Vent froid'],
    volcanic: ['Brume d’altitude', 'Vent froid', 'Éclaircies', 'Nuages hauts'],
    forest: ['Brume', 'Averses', 'Couvert', 'Éclaircies'],
    plateau: ['Vent frais', 'Couvert', 'Éclaircies', 'Neige légère'],
    polar: ['Neige', 'Vent polaire', 'Ciel clair', 'Brume glacée'],
    rock: ['Vent d’altitude', 'Éclaircies', 'Couvert', 'Brume'],
    arid: ['Ciel dégagé', 'Vent sec', 'Nuages hauts', 'Éclaircies'],
  }
  const index = (mountain.order + now.getDate() + now.getMonth()) % options[mountain.environment].length
  const baseTemperature = mountain.environment === 'polar' ? -18 : mountain.environment === 'alpine' ? -6 : mountain.environment === 'volcanic' ? 4 : mountain.environment === 'forest' ? 8 : mountain.environment === 'arid' ? 21 : 5
  return { label: options[mountain.environment][index], temperature: baseTemperature - (index === 1 ? 4 : 0), simulated: true }
}
