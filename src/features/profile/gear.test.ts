import { describe, expect, it } from 'vitest'
import { gear, gearCategories, getEquippedBonuses, getExpeditionPebbles } from './gear'
import { PIXEL_GEAR_IDS } from './gearIcons'
import type { SessionRecord } from '../sessions/model'

const session = (minutes: number, outcome: 'completed' | 'abandoned' = 'completed', bonusPebbles = 0): SessionRecord => ({
  id: 'x', mountainId: 'mountain-001', activity: 'Mathématiques', skill: 'Concentration', plannedDurationMinutes: minutes, startedAt: 0, endsAt: minutes * 60_000,
  endedAt: minutes * 60_000, actualDurationSeconds: minutes * 60, outcome, skillXpLost: 0, gearBonuses: { ascentPercent: 0, skillXpPercent: 0, bonusPebbles },
})

describe('galets', () => {
  it('rapportent 1 galet toutes les 10 minutes de séance terminée', () => {
    expect(getExpeditionPebbles(session(25))).toBe(2)
    expect(getExpeditionPebbles(session(60))).toBe(6)
    expect(getExpeditionPebbles(session(120))).toBe(12)
    expect(getExpeditionPebbles(session(9))).toBe(0)
    expect(getExpeditionPebbles(session(10))).toBe(1)
  })

  it('ajoutent les galets de l’équipement pour chaque heure complète, et rien en cas d’abandon', () => {
    expect(getExpeditionPebbles(session(60, 'completed', 1))).toBe(7)
    expect(getExpeditionPebbles(session(59, 'completed', 1))).toBe(5)
    expect(getExpeditionPebbles(session(120, 'completed', 2))).toBe(16)
    expect(getExpeditionPebbles(session(120, 'abandoned', 2))).toBe(0)
  })
})

describe('équilibrage de la boutique', () => {
  it('garde un équipement de départ gratuit et des effets bornés', () => {
    expect(gear.filter((item) => item.cost === 0).map((item) => item.id)).toEqual(['boots'])
    const best = gear.map((item) => item.id)
    expect(getEquippedBonuses(best).ascentPercent < 41).toBe(true)
  })

  it('coûte environ 85 heures de travail pour tout acheter', () => {
    const fullKit = gear.reduce((sum, item) => sum + item.cost, 0)
    expect(fullKit / 6 > 60).toBe(true)
    expect(fullKit / 6 < 120).toBe(true)
  })

  it('range chaque objet dans une catégorie et lui donne un dessin', () => {
    const categories = new Set(gearCategories.map((item) => item.id))
    for (const item of gear) {
      expect(categories.has(item.categoryId)).toBe(true)
      expect(item.sprite !== undefined || (item.pixel !== undefined && PIXEL_GEAR_IDS.includes(item.pixel))).toBe(true)
    }
    expect(new Set(gear.map((item) => item.id)).size).toBe(gear.length)
  })
})
