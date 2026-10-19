import { describe, expect, it } from 'vitest'
import { mountains } from '../../data/mountain'
import { getLandscape, getLandscapeId, type LandscapeId } from './landscape'

const byName = (name: string) => mountains.find((item) => item.name === name)!

describe('les cinq paysages de la marche', () => {
  it('choisit le paysage selon l’altitude, le continent et la nature de la montagne', () => {
    const expected: Record<string, LandscapeId> = {
      'Ben Nevis': 'forest',
      'Mont Kosciuszko': 'forest',
      'Mont Blanc': 'alpine',
      'Cervin (Matterhorn)': 'alpine',
      'Fitz Roy': 'alpine',
      Everest: 'extreme',
      K2: 'extreme',
      'Massif Vinson': 'extreme',
      Huascarán: 'extreme',
      'Mont Fuji': 'volcano',
      Cotopaxi: 'volcano',
      Uluru: 'desert',
      'Mont Kenya': 'desert',
      'Mont Toubkal': 'desert',
    }
    for (const [name, id] of Object.entries(expected)) expect(getLandscapeId(byName(name))).toBe(id)
  })

  it('utilise bien les cinq paysages sur les 100 montagnes, et seulement eux', () => {
    const counts = new Map<LandscapeId, number>()
    for (const item of mountains) counts.set(getLandscapeId(item), (counts.get(getLandscapeId(item)) ?? 0) + 1)
    expect(counts.size).toBe(5)
    for (const count of counts.values()) expect(count >= 5).toBe(true)
  })

  it('fait pleuvoir sur la forêt tropicale, souffler la poussière dans le désert et tomber la cendre sur les volcans', () => {
    expect(getLandscape(byName('Mont Kinabalu')).precipitation).toBe('rain')
    expect(getLandscape(byName('Ben Nevis')).precipitation).toBe('snow')
    expect(getLandscape(byName('Uluru')).precipitation).toBe('dust')
    expect(getLandscape(byName('Teide')).precipitation).toBe('ash')
  })

  it('accroche les drapeaux de prière au Népal et au Tibet seulement', () => {
    expect(getLandscape(byName('Everest')).prayerFlags).toBe(true)
    expect(getLandscape(byName('K2')).prayerFlags).toBe(true)
    expect(getLandscape(byName('Nanga Parbat')).prayerFlags).toBe(false)
  })
})
