import { describe, expect, it } from 'vitest'
import { getActivityTotals, getCurrentExpedition, getExpeditionMetrics, getLiveAltitude, getRouteProgress, getSessionAltitudeGain, formatFocusTime } from './progression'
import type { SessionRecord } from './model'

const mountain = { altitude: 2400, virtualDurationMinutes: 200 } // 2 400 m à raison de 1 m toutes les 5 s
const record = (id: string, activity: string, seconds: number): SessionRecord => ({
  id, mountainId: 'mountain-001', activity, skill: 'Concentration', plannedDurationMinutes: 60, startedAt: 1000, endsAt: 3_601_000,
  endedAt: 1000 + seconds * 1000, actualDurationSeconds: seconds, outcome: 'completed', skillXpLost: 0,
})

describe('progression virtuelle', () => {
  it('convertit le temps réel en altitude et plafonne au sommet', () => {
    const metrics = getExpeditionMetrics([record('one', 'Mathématiques', 3600)], mountain)
    expect(metrics.totalFocusSeconds).toBe(3600)
    expect(metrics.currentAltitude).toBe(720)
    expect(metrics.progressPercent).toBeCloseTo(720 / 2400 * 100)
    expect(metrics.summitsReached).toBe(0)
    expect(getExpeditionMetrics([record('long', 'Révisions', 24 * 3600)], mountain).currentAltitude).toBe(2400)
  })

  it('attribue le gain virtuel d’une session sans cumul double', () => {
    const first = record('first', 'Mathématiques', 1800)
    const second = record('second', 'Informatique', 1800)
    expect(getSessionAltitudeGain([second, first], 'second', mountain)).toBe(360)
    expect(getSessionAltitudeGain([second, first], 'missing', mountain)).toBe(0)
  })

  it('conserve les minutes interrompues au carnet sans les convertir en altitude', () => {
    const interrupted: SessionRecord = { ...record('interrupted', 'Mathématiques', 1800), outcome: 'abandoned' }
    const metrics = getExpeditionMetrics([interrupted], mountain)
    expect(metrics.totalFocusSeconds).toBe(1800)
    expect(metrics.currentAltitude).toBe(0)
    expect(metrics.summitsReached).toBe(0)
    expect(getSessionAltitudeGain([interrupted], 'interrupted', mountain)).toBe(0)
  })

  it('redémarre l’altitude depuis le camp de départ après une interruption', () => {
    const previous = { ...record('previous', 'Mathématiques', 3600), startedAt: 1_000, endedAt: 3_601_000 }
    const abandoned = { ...record('abandoned', 'Mathématiques', 600), startedAt: 3_602_000, endsAt: 7_202_000, endedAt: 4_202_000, outcome: 'abandoned' as const }
    const resumed = { ...record('resumed', 'Mathématiques', 1800), startedAt: 4_203_000, endsAt: 7_803_000, endedAt: 6_003_000 }
    const metrics = getExpeditionMetrics([resumed, abandoned, previous], mountain)
    expect(metrics.totalFocusSeconds).toBe(6000)
    expect(metrics.currentAltitude).toBe(360)
  })

  it('regroupe les durées par activité et les affiche sans inventer de points', () => {
    const totals = getActivityTotals([record('a', 'Mathématiques', 1800), record('b', 'Mathématiques', 1200), record('c', 'Sport', 2400)])
    expect(totals).toEqual([
      { activity: 'Mathématiques', seconds: 3000, sessions: 2 },
      { activity: 'Sport', seconds: 2400, sessions: 1 },
    ])
    expect(formatFocusTime(3660)).toBe('01 h 01 min')
  })
})

describe('ordre fixe des expéditions', () => {
  const catalogue = [
    { id: 'mountain-001', altitude: 100, virtualDurationMinutes: 60 },
    { id: 'mountain-002', altitude: 200, virtualDurationMinutes: 60 },
    { id: 'mountain-003', altitude: null, virtualDurationMinutes: 60 },
  ]
  const on = (mountainId: string, id: string, seconds: number, endedAt = 1000 + seconds * 1000): SessionRecord => ({ ...record(id, 'Mathématiques', seconds), mountainId, endedAt })

  it('commence par la première montagne', () => {
    expect(getCurrentExpedition([], catalogue).id).toBe('mountain-001')
  })

  it('passe à la montagne suivante seulement quand le sommet est atteint', () => {
    expect(getCurrentExpedition([on('mountain-001', 'a', 3000)], catalogue).id).toBe('mountain-001')
    expect(getCurrentExpedition([on('mountain-001', 'a', 3600)], catalogue).id).toBe('mountain-002')
    expect(getCurrentExpedition([on('mountain-001', 'a', 3600), on('mountain-002', 'b', 1800)], catalogue).id).toBe('mountain-002')
  })

  it('traite les voies sans altitude comme des expéditions à part entière', () => {
    const history = [on('mountain-001', 'a', 3600), on('mountain-002', 'b', 3600)]
    expect(getCurrentExpedition(history, catalogue).id).toBe('mountain-003')
    expect(getExpeditionMetrics([on('mountain-003', 'c', 1800)], catalogue[2]).progressPercent).toBe(50)
    expect(getExpeditionMetrics([on('mountain-003', 'c', 3600)], catalogue[2]).summitsReached).toBe(1)
  })

  it('garde la dernière montagne quand tout est terminé', () => {
    const history = catalogue.map((item, index) => on(item.id, `s${index}`, 3600))
    expect(getCurrentExpedition(history, catalogue).id).toBe('mountain-003')
  })

  it('revient au premier camp d’une montagne après une interruption sans toucher aux sommets déjà atteints', () => {
    const abandoned: SessionRecord = { ...on('mountain-002', 'x', 600, 99_000_000), outcome: 'abandoned', startedAt: 98_000_000 }
    const history = [abandoned, on('mountain-002', 'b', 1800, 98_000_000), on('mountain-001', 'a', 3600)]
    expect(getExpeditionMetrics(history.filter((item) => item.mountainId === 'mountain-002'), catalogue[1]).progressPercent).toBe(0)
    expect(getCurrentExpedition(history, catalogue).id).toBe('mountain-002')
  })
})

describe('position sur l’itinéraire', () => {
  const metrics = getExpeditionMetrics([record('one', 'Mathématiques', 3600)], mountain)

  it('ajoute le temps de la session en cours sans l’inventer', () => {
    expect(getRouteProgress(metrics, 0)).toBeCloseTo(3600 / 12000)
    expect(getRouteProgress(metrics, 1800)).toBeCloseTo(5400 / 12000)
    expect(getRouteProgress(metrics, 1800, 10)).toBeCloseTo((3600 + 1980) / 12000)
  })

  it('reste entre le camp et le sommet', () => {
    expect(getRouteProgress({ ...metrics, creditedSeconds: 0 }, -50)).toBe(0)
    expect(getRouteProgress(metrics, 10 * 86400)).toBe(1)
  })
})

describe('un mètre toutes les 5 secondes', () => {
  const metrics = getExpeditionMetrics([], mountain)

  it('gagne un mètre à chaque tranche de 5 secondes, sans en inventer avant', () => {
    expect(getLiveAltitude(metrics, 0)).toBe(0)
    expect(getLiveAltitude(metrics, 4)).toBe(0)
    expect(getLiveAltitude(metrics, 5)).toBe(1)
    expect(getLiveAltitude(metrics, 9)).toBe(1)
    expect(getLiveAltitude(metrics, 10)).toBe(2)
    expect(getLiveAltitude(metrics, 60)).toBe(12)
    expect(getLiveAltitude(metrics, 3600)).toBe(720)
  })

  it('monte un peu plus vite avec l’équipement, et s’arrête au sommet', () => {
    expect(getLiveAltitude(metrics, 100, 20)).toBe(24)
    expect(getLiveAltitude(metrics, 10 * 86400)).toBe(2400)
  })

  it('compte le travail déjà validé en plus de la séance en cours', () => {
    const done = getExpeditionMetrics([record('one', 'Mathématiques', 1800)], mountain)
    expect(done.currentAltitude).toBe(360)
    expect(getLiveAltitude(done, 600)).toBe(480)
  })

  it('donne aux voies sans altitude celle que leur durée implique', () => {
    const route = { altitude: null, virtualDurationMinutes: 100 }
    const routeMetrics = getExpeditionMetrics([record('r', 'Mathématiques', 3000)], route)
    expect(routeMetrics.summitAltitude).toBe(1200)
    expect(routeMetrics.currentAltitude).toBe(600)
    expect(getLiveAltitude(routeMetrics, 0)).toBe(600)
  })
})

