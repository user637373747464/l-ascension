import { SECONDS_PER_METER } from '../../data/mountain'
import type { SessionRecord } from './model'

export interface ExpeditionMetrics {
  totalFocusSeconds: number
  /** Seconds of completed sessions counted toward the summit since the last return to base. */
  creditedSeconds: number
  /** Seconds of real work needed to reach the summit of this expedition. */
  targetSeconds: number
  /** Height of the summit, in metres: the one of the mountain, or the one of its route when it has none of its own. */
  summitAltitude: number
  currentAltitude: number
  progressPercent: number
  summitsReached: number
}

type MountainScale = { id?: string; altitude: number | null; virtualDurationMinutes: number }

function forMountain(history: SessionRecord[], mountain: MountainScale): SessionRecord[] {
  return mountain.id ? history.filter((session) => session.mountainId === mountain.id) : history
}

export function getExpeditionMetrics(history: SessionRecord[], mountain: MountainScale): ExpeditionMetrics {
  const targetSeconds = Math.max(1, Math.round(mountain.virtualDurationMinutes * 60))
  const altitude = mountain.altitude ?? Math.round(targetSeconds / SECONDS_PER_METER)
  const relevantHistory = forMountain(history, mountain)
  const totalFocusSeconds = relevantHistory.reduce((sum, session) => sum + session.actualDurationSeconds, 0)
  // An interrupted climb returns to the initial camp. Completed sessions after that date
  // establish a fresh route from the base without erasing any real work from the carnet.
  const lastReturnToBase = relevantHistory.reduce((latest, session) => session.outcome === 'abandoned' ? Math.max(latest, session.endedAt) : latest, 0)
  const creditedSeconds = relevantHistory.reduce((sum, session) => {
    if (session.outcome !== 'completed' || session.endedAt <= lastReturnToBase) return sum
    const bonus = session.gearBonuses?.ascentPercent ?? 0
    return sum + Math.floor(session.actualDurationSeconds * (1 + bonus / 100))
  }, 0)
  const currentAltitude = Math.min(altitude, Math.floor((creditedSeconds * altitude) / targetSeconds))
  return {
    totalFocusSeconds,
    creditedSeconds,
    targetSeconds,
    summitAltitude: altitude,
    currentAltitude,
    // Routes without a documented altitude still progress through time alone.
    progressPercent: Math.min(100, (creditedSeconds / targetSeconds) * 100),
    summitsReached: creditedSeconds >= targetSeconds ? 1 : 0,
  }
}

/**
 * Expeditions follow the fixed catalogue order: the current one is the first whose summit is not reached yet.
 * Once every summit is reached, the last one stays current.
 */
export function getCurrentExpedition<T extends MountainScale & { id: string }>(history: SessionRecord[], catalogue: readonly T[]): T {
  const byMountain = new Map<string, SessionRecord[]>()
  for (const session of history) {
    const group = byMountain.get(session.mountainId)
    if (group) group.push(session)
    else byMountain.set(session.mountainId, [session])
  }
  for (const mountain of catalogue) {
    const group = byMountain.get(mountain.id)
    if (!group || getExpeditionMetrics(group, mountain).summitsReached === 0) return mountain
  }
  return catalogue[catalogue.length - 1]
}

/** Position on the route, from 0 (base camp) to 1 (summit), including the session being worked right now. */
export function getRouteProgress(metrics: ExpeditionMetrics, liveSeconds = 0, ascentPercent = 0): number {
  const live = Math.floor(Math.max(0, liveSeconds) * (1 + ascentPercent / 100))
  return Math.max(0, Math.min(1, (metrics.creditedSeconds + live) / metrics.targetSeconds))
}

/** Altitude reached right now, in whole metres: one more every 5 seconds of work (a little faster with the equipment). */
export function getLiveAltitude(metrics: ExpeditionMetrics, liveSeconds = 0, ascentPercent = 0): number {
  const live = Math.floor(Math.max(0, liveSeconds) * (1 + ascentPercent / 100))
  return Math.min(metrics.summitAltitude, Math.floor(((metrics.creditedSeconds + live) * metrics.summitAltitude) / metrics.targetSeconds))
}

export function getSessionAltitudeGain(history: SessionRecord[], sessionId: string, mountain: MountainScale): number {
  const relevantHistory = forMountain(history, mountain)
  const session = relevantHistory.find((record) => record.id === sessionId)
  if (!session) return 0
  const before = getExpeditionMetrics(relevantHistory.filter((record) => record.id !== sessionId), mountain).currentAltitude
  const after = getExpeditionMetrics(relevantHistory, mountain).currentAltitude
  return Math.max(0, after - before)
}

export function getActivityTotals(history: SessionRecord[]): Array<{ activity: string; seconds: number; sessions: number }> {
  const totals = new Map<string, { seconds: number; sessions: number }>()
  for (const session of history) {
    const entry = totals.get(session.activity) ?? { seconds: 0, sessions: 0 }
    entry.seconds += session.actualDurationSeconds
    entry.sessions += 1
    totals.set(session.activity, entry)
  }
  return [...totals].map(([activity, value]) => ({ activity, ...value })).sort((a, b) => b.seconds - a.seconds || a.activity.localeCompare(b.activity, 'fr'))
}

export function formatFocusTime(seconds: number): string {
  const totalMinutes = Math.floor(Math.max(0, seconds) / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${String(minutes).padStart(2, '0')} min`
  return `${String(hours).padStart(2, '0')} h ${String(minutes).padStart(2, '0')} min`
}
