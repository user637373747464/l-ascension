import { describe, expect, it } from 'vitest'
import { formatHours, getClimbMeters, getVirtualDurationMinutes, mountains, SECONDS_PER_METER, startingMountain } from './mountain'

describe('catalogue des montagnes', () => {
  it('garde les 100 entrées à leur ordre source et distingue les voies', () => {
    expect(mountains).toHaveLength(100)
    expect(mountains[0].sourceLabel).toBe('Mont Kosciuszko — 2 228 m')
    expect(mountains[89].entryType).toBe('route')
    expect(mountains[89].altitude).toBeNull()
    expect(mountains[98].name).toBe('Masherbrum')
    expect(startingMountain.routeName).toContain('Thredbo')
  })

  it('ne présente pas les camps non documentés comme vérifiés', () => {
    expect(startingMountain.verified).toBe(true)
    expect(mountains[1].verified).toBe(false)
    expect(mountains[1].baseName).toBeNull()
    expect(mountains[1].routeName).toBeNull()
  })

  it('fait gagner un mètre toutes les 5 secondes : la durée d’un sommet vient de sa hauteur', () => {
    expect(SECONDS_PER_METER).toBe(5)
    // 12 m par minute, 720 m par heure
    expect(getVirtualDurationMinutes(720)).toBe(60)
    expect(mountains[0].virtualDurationMinutes * 60).toBe(2228 * 5)
    expect(mountains[1].virtualDurationMinutes * 60).toBe(1345 * 5)
    const everest = mountains.find((item) => item.name === 'Everest')!
    expect(everest.virtualDurationMinutes * 60).toBe(8849 * 5)
    expect(everest.virtualDurationMinutes > mountains[1].virtualDurationMinutes * 6).toBe(true)
  })

  it('donne aux voies la hauteur de leur montagne', () => {
    const route = mountains.find((item) => item.name === 'Everest, arête ouest')!
    expect(route.altitude).toBeNull()
    expect(route.virtualDurationMinutes * 60).toBe(8849 * 5)
    expect(getClimbMeters(null)).toBe(8000)
    for (const item of mountains) expect(item.virtualDurationMinutes > 0).toBe(true)
  })

  it('écrit les durées pour l’interface', () => {
    expect(formatHours(180)).toBe('3 h')
    expect(formatHours(750)).toBe('12 h 30')
    expect(formatHours(29)).toBe('29 min')
    expect(formatHours(737.4)).toBe('12 h 17')
  })
})
