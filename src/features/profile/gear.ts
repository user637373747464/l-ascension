import type { SessionRecord } from '../sessions/model'
import { asset } from '../../assetUrl'

export type GearBonuses = {
  ascentPercent: number
  skillXpPercent: number
  bonusPebbles: number
}

export type GearCategory = {
  id: string
  label: string
}

export type GearSprite = {
  x: number
  y: number
  width: number
  height: number
}

export type GearItem = {
  id: string
  categoryId: string
  name: string
  detail: string
  cost: number
  tier: number
  effect: string
  bonuses: Partial<GearBonuses>
  /** Position on the sprite sheet, or the id of a pixel-art icon drawn in the app. */
  sprite?: GearSprite
  pixel?: string
}

export type ProfileState = { owned: string[]; equipped: string[]; spent: number }

export const PROFILE_KEY = 'ascension.profile.v1'
export const GEAR_SHEET = asset('/illustrations/sherpa/gear-sprite-sheet.png')

export const gearCategories: GearCategory[] = [
  { id: 'piolets', label: 'Piolets' },
  { id: 'crampons', label: 'Crampons' },
  { id: 'boots', label: 'Bottes' },
  { id: 'packs', label: 'Sacs' },
  { id: 'parkas', label: 'Parkas' },
  { id: 'gloves', label: 'Gants' },
  { id: 'helmets', label: 'Casques' },
  { id: 'glasses', label: 'Lunettes' },
  { id: 'ropes', label: 'Cordes' },
  { id: 'bivouac', label: 'Bivouac' },
  { id: 'food', label: 'Vivres' },
  { id: 'navigation', label: 'Orientation' },
]

// A galet is earned for every 10 minutes of a completed session (plus the galets of the equipment).
// The whole collection costs about 85 hours of work: the rest of the game is climbing.
export const gear: GearItem[] = [
  { id: 'piolet-sentier', categoryId: 'piolets', name: 'Piolet du sentier', detail: 'Acier forgé · prise sûre', cost: 6, tier: 1, effect: '+1 % de progression d’ascension', bonuses: { ascentPercent: 1 }, sprite: { x: 14, y: 12, width: 155, height: 211 } },
  { id: 'piolet-glacier', categoryId: 'piolets', name: 'Piolet glacier', detail: 'Lame acier · manche léger', cost: 13, tier: 2, effect: '+2 % de progression d’ascension', bonuses: { ascentPercent: 2 }, sprite: { x: 162, y: 12, width: 159, height: 211 } },
  { id: 'piolet-aretes', categoryId: 'piolets', name: 'Piolet des arêtes', detail: 'Alliage léger · haute altitude', cost: 24, tier: 3, effect: '+4 % de progression d’ascension', bonuses: { ascentPercent: 4 }, sprite: { x: 592, y: 12, width: 126, height: 211 } },

  { id: 'crampons', categoryId: 'crampons', name: 'Crampons 10 pointes', detail: 'Acier · neige compacte', cost: 6, tier: 1, effect: '+1 % de progression d’ascension', bonuses: { ascentPercent: 1 }, sprite: { x: 946, y: 51, width: 190, height: 174 } },
  { id: 'crampons-glacier', categoryId: 'crampons', name: 'Crampons glacier', detail: '12 pointes · accroche mixte', cost: 13, tier: 2, effect: '+2 % de progression d’ascension', bonuses: { ascentPercent: 2 }, sprite: { x: 1138, y: 51, width: 170, height: 174 } },
  { id: 'crampons-haute-altitude', categoryId: 'crampons', name: 'Crampons haute altitude', detail: 'Acier traité · glace raide', cost: 24, tier: 3, effect: '+4 % de progression d’ascension', bonuses: { ascentPercent: 4 }, sprite: { x: 1315, y: 39, width: 218, height: 190 } },

  { id: 'boots', categoryId: 'boots', name: 'Bottes de marche', detail: 'Matériel de départ · semelle rigide', cost: 0, tier: 0, effect: 'Équipement de départ', bonuses: {}, sprite: { x: 293, y: 734, width: 145, height: 161 } },
  { id: 'boots-approach', categoryId: 'boots', name: 'Bottes d’approche', detail: 'Cuir renforcé · portage quotidien', cost: 12, tier: 2, effect: '+1 % d’XP de compétence', bonuses: { skillXpPercent: 1 }, sprite: { x: 427, y: 731, width: 133, height: 165 } },
  { id: 'boots-expedition', categoryId: 'boots', name: 'Bottes des hautes routes', detail: 'Isolation · longues expéditions', cost: 22, tier: 3, effect: '+2 % d’XP de compétence', bonuses: { skillXpPercent: 2 }, sprite: { x: 661, y: 727, width: 143, height: 171 } },

  { id: 'sac', categoryId: 'packs', name: 'Sac d’approche 35 L', detail: 'Dos réglable · sorties courtes', cost: 8, tier: 1, effect: '+1 % d’XP de compétence', bonuses: { skillXpPercent: 1 }, sprite: { x: 10, y: 216, width: 161, height: 218 } },
  { id: 'sac-glacier', categoryId: 'packs', name: 'Sac glacier 45 L', detail: 'Armature légère · portage stable', cost: 16, tier: 2, effect: '+1 % d’ascension · +1 % d’XP', bonuses: { ascentPercent: 1, skillXpPercent: 1 }, sprite: { x: 345, y: 222, width: 90, height: 210 } },
  { id: 'sac-expedition', categoryId: 'packs', name: 'Sac d’expédition 60 L', detail: 'Cadre aluminium · charge répartie', cost: 25, tier: 3, effect: '+2 % d’ascension · +2 % d’XP', bonuses: { ascentPercent: 2, skillXpPercent: 2 }, sprite: { x: 562, y: 218, width: 154, height: 214 } },

  { id: 'parka', categoryId: 'parkas', name: 'Doudoune légère', detail: 'Isolation duvet · vent froid', cost: 8, tier: 1, effect: '+1 % d’XP de compétence', bonuses: { skillXpPercent: 1 }, sprite: { x: 840, y: 220, width: 160, height: 212 } },
  { id: 'parka-glacier', categoryId: 'parkas', name: 'Parka glacier 800', detail: 'Duvet 800 · membrane coupe-vent', cost: 16, tier: 2, effect: '+2 % d’XP de compétence', bonuses: { skillXpPercent: 2 }, sprite: { x: 987, y: 218, width: 157, height: 214 } },
  { id: 'parka-sommet', categoryId: 'parkas', name: 'Parka des sommets', detail: 'Grand froid · renforts aux épaules', cost: 25, tier: 3, effect: '+3 % d’XP de compétence', bonuses: { skillXpPercent: 3 }, sprite: { x: 1139, y: 218, width: 142, height: 214 } },

  { id: 'gants-marche', categoryId: 'gloves', name: 'Gants de marche', detail: 'Cuir et laine · sentiers froids', cost: 5, tier: 1, effect: '+1 % d’XP de compétence', bonuses: { skillXpPercent: 1 }, pixel: 'gants-marche' },
  { id: 'gants-glacier', categoryId: 'gloves', name: 'Gants glacier', detail: 'Membrane coupe-vent · doigts articulés', cost: 11, tier: 2, effect: '+1 % d’ascension · +1 % d’XP', bonuses: { ascentPercent: 1, skillXpPercent: 1 }, pixel: 'gants-glacier' },
  { id: 'moufles-sommet', categoryId: 'gloves', name: 'Moufles des sommets', detail: 'Duvet · grand froid', cost: 22, tier: 3, effect: '+2 % d’ascension · +2 % d’XP', bonuses: { ascentPercent: 2, skillXpPercent: 2 }, pixel: 'moufles-sommet' },

  { id: 'casque-cordee', categoryId: 'helmets', name: 'Casque de cordée', detail: 'Coque ABS · réglage rapide', cost: 6, tier: 1, effect: '+1 % de progression d’ascension', bonuses: { ascentPercent: 1 }, sprite: { x: 286, y: 426, width: 142, height: 145 } },
  { id: 'casque-alpin', categoryId: 'helmets', name: 'Casque alpin léger', detail: 'Coque ventilée · maintien renforcé', cost: 13, tier: 2, effect: '+2 % de progression d’ascension', bonuses: { ascentPercent: 2 }, sprite: { x: 6, y: 426, width: 158, height: 145 } },
  { id: 'casque-haute-route', categoryId: 'helmets', name: 'Casque haute route', detail: 'Protection étendue · coque légère', cost: 24, tier: 3, effect: '+3 % de progression d’ascension', bonuses: { ascentPercent: 3 }, sprite: { x: 536, y: 426, width: 139, height: 145 } },

  { id: 'lunettes', categoryId: 'glasses', name: 'Lunettes glacier', detail: 'Filtre UV · écran ambré', cost: 5, tier: 1, effect: '+1 % d’XP de compétence', bonuses: { skillXpPercent: 1 }, sprite: { x: 670, y: 431, width: 145, height: 111 } },
  { id: 'lunettes-polaire', categoryId: 'glasses', name: 'Masque polaire', detail: 'Double écran · vision périphérique', cost: 11, tier: 2, effect: '+2 % d’XP de compétence', bonuses: { skillXpPercent: 2 }, sprite: { x: 815, y: 430, width: 151, height: 112 } },
  { id: 'lunettes-haute-lumiere', categoryId: 'glasses', name: 'Masque haute lumière', detail: 'Écran miroir · protection neige', cost: 21, tier: 3, effect: '+3 % d’XP de compétence', bonuses: { skillXpPercent: 3 }, sprite: { x: 963, y: 433, width: 151, height: 108 } },

  { id: 'corde', categoryId: 'ropes', name: 'Corde de glacier 30 m', detail: 'Polyamide · progression encordée', cost: 6, tier: 1, effect: '+1 % de progression d’ascension', bonuses: { ascentPercent: 1 }, sprite: { x: 2, y: 572, width: 121, height: 181 } },
  { id: 'corde-renforcee', categoryId: 'ropes', name: 'Corde renforcée 50 m', detail: 'Gaine tressée · meilleure tenue', cost: 13, tier: 2, effect: '+2 % de progression d’ascension', bonuses: { ascentPercent: 2 }, sprite: { x: 116, y: 572, width: 120, height: 181 } },
  { id: 'corde-arctique', categoryId: 'ropes', name: 'Corde des arêtes 60 m', detail: 'Traitement hydrophobe · grande voie', cost: 24, tier: 3, effect: '+4 % de progression d’ascension', bonuses: { ascentPercent: 4 }, sprite: { x: 220, y: 572, width: 124, height: 181 } },

  { id: 'duvet', categoryId: 'bivouac', name: 'Duvet de camp −10 °C', detail: 'Garnissage compact · nuits fraîches', cost: 8, tier: 1, effect: '+1 % d’XP de compétence', bonuses: { skillXpPercent: 1 }, sprite: { x: 1400, y: 730, width: 136, height: 170 } },
  { id: 'bivouac-glacier', categoryId: 'bivouac', name: 'Tente glacier 2 places', detail: 'Double-toit · arceaux aluminium', cost: 16, tier: 2, effect: '+1 % d’ascension · +1 % d’XP', bonuses: { ascentPercent: 1, skillXpPercent: 1 }, sprite: { x: 1185, y: 730, width: 222, height: 170 } },
  { id: 'bivouac-haute-altitude', categoryId: 'bivouac', name: 'Abri haute altitude', detail: 'Tente 4 saisons · duvet grand froid', cost: 25, tier: 3, effect: '+2 % d’ascension · +2 % d’XP', bonuses: { ascentPercent: 2, skillXpPercent: 2 }, sprite: { x: 1185, y: 730, width: 222, height: 170 } },

  { id: 'barres', categoryId: 'food', name: 'Barres de céréales', detail: 'Miel et avoine · dans la poche', cost: 5, tier: 1, effect: '+1 % d’XP de compétence', bonuses: { skillXpPercent: 1 }, pixel: 'barres' },
  { id: 'the-beurre', categoryId: 'food', name: 'Thé au beurre de yak', detail: 'Thermos de Tenzin · chaud toute la journée', cost: 14, tier: 2, effect: '+1 galet par heure de travail', bonuses: { bonusPebbles: 1 }, pixel: 'the-beurre' },
  { id: 'festin', categoryId: 'food', name: 'Festin du camp', detail: 'Repas lyophilisés · énergie longue durée', cost: 24, tier: 3, effect: '+2 % d’ascension · +2 % d’XP', bonuses: { ascentPercent: 2, skillXpPercent: 2 }, pixel: 'festin' },

  { id: 'lampe', categoryId: 'navigation', name: 'Frontale de bivouac', detail: 'Batterie rechargeable · halo large', cost: 6, tier: 1, effect: '+1 % d’XP de compétence', bonuses: { skillXpPercent: 1 }, sprite: { x: 354, y: 901, width: 130, height: 119 } },
  { id: 'boussole', categoryId: 'navigation', name: 'Boussole et carte topo', detail: 'Orientation fiable · carte des cols', cost: 13, tier: 2, effect: '+2 % d’XP de compétence', bonuses: { skillXpPercent: 2 }, sprite: { x: 470, y: 884, width: 236, height: 138 } },
  { id: 'gps-sommet', categoryId: 'navigation', name: 'GPS des hautes routes', detail: 'Traceur satellite · repères précis', cost: 24, tier: 3, effect: '+1 galet par heure de travail', bonuses: { bonusPebbles: 1 }, sprite: { x: 1287, y: 886, width: 132, height: 136 } },
]

const defaultProfile: ProfileState = { owned: ['boots'], equipped: ['boots'], spent: 0 }
const knownGear = new Set(gear.map((item) => item.id))
const oldPrices: Record<string, number> = { parka: 4, sac: 6, lampe: 3, crampons: 5, lunettes: 4, duvet: 5, boots: 0 }

function boundedBonus(value: unknown, maximum: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(maximum, value)) : 0
}

export function normalizeGearBonuses(value: unknown): GearBonuses {
  const bonuses = typeof value === 'object' && value !== null ? value as Partial<GearBonuses> : {}
  return {
    ascentPercent: boundedBonus(bonuses.ascentPercent, 40),
    skillXpPercent: boundedBonus(bonuses.skillXpPercent, 40),
    bonusPebbles: Math.floor(boundedBonus(bonuses.bonusPebbles, 2)),
  }
}

export function loadProfile(): ProfileState {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return defaultProfile
    const parsed = JSON.parse(raw) as Partial<ProfileState>
    const owned = Array.isArray(parsed.owned) ? parsed.owned.filter((id): id is string => typeof id === 'string' && knownGear.has(id)) : [...defaultProfile.owned]
    if (!owned.includes('boots')) owned.push('boots')
    const equipped = Array.isArray(parsed.equipped) ? parsed.equipped.filter((id): id is string => typeof id === 'string' && owned.includes(id)) : [...defaultProfile.equipped]
    const legacySpend = owned.reduce((sum, id) => sum + (oldPrices[id] ?? gear.find((item) => item.id === id)?.cost ?? 0), 0)
    const spent = typeof parsed.spent === 'number' && Number.isFinite(parsed.spent) && parsed.spent >= 0 ? Math.floor(parsed.spent) : legacySpend
    return { owned, equipped: equipped.length ? equipped : ['boots'], spent }
  } catch {
    return defaultProfile
  }
}

export function saveProfile(profile: ProfileState): void {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)) } catch { /* Profile stays usable for this visit. */ }
}

export function getEquippedBonuses(equipped: string[]): GearBonuses {
  const total = equipped.reduce<GearBonuses>((sum, id) => {
    const item = gear.find((entry) => entry.id === id)
    if (!item) return sum
    return {
      ascentPercent: sum.ascentPercent + (item.bonuses.ascentPercent ?? 0),
      skillXpPercent: sum.skillXpPercent + (item.bonuses.skillXpPercent ?? 0),
      bonusPebbles: sum.bonusPebbles + (item.bonuses.bonusPebbles ?? 0),
    }
  }, { ascentPercent: 0, skillXpPercent: 0, bonusPebbles: 0 })
  return normalizeGearBonuses(total)
}

/** One galet for every 10 minutes of a completed session, plus the galets of the equipment for every full hour. */
export const SECONDS_PER_PEBBLE = 600

export function getExpeditionPebbles(session: SessionRecord): number {
  if (session.outcome !== 'completed') return 0
  const seconds = Math.max(0, session.actualDurationSeconds)
  return Math.floor(seconds / SECONDS_PER_PEBBLE) + normalizeGearBonuses(session.gearBonuses).bonusPebbles * Math.floor(seconds / 3600)
}
