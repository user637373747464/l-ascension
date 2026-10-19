import { makeId, type StorageLike } from '../planner/model'
import { normalizeGearBonuses, type GearBonuses } from '../profile/gear'

export interface ActiveSession {
  id: string
  mountainId: string
  activity: string
  skill: string
  plannedDurationMinutes: number
  startedAt: number
  endsAt: number
  /** Set while the session is paused: the clock is frozen at this instant. */
  pausedAt?: number
  gearBonuses?: GearBonuses
}

export interface SessionRecord extends ActiveSession {
  endedAt: number
  actualDurationSeconds: number
  outcome: 'completed' | 'abandoned'
  skillXpLost: number
}

export interface SessionData {
  version: 2
  active: ActiveSession | null
  history: SessionRecord[]
  pendingSummaryId: string | null
}

export const SESSION_STORAGE_KEY = 'ascension.sessions.v1'
export const EMPTY_SESSION_DATA: SessionData = { version: 2, active: null, history: [], pendingSummaryId: null }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isValidId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length < 100

function browserStorage(): StorageLike | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

function withoutPause(session: ActiveSession): ActiveSession {
  const copy = { ...session }
  delete copy.pausedAt
  return copy
}

function parseActive(value: unknown): ActiveSession | null {
  if (!isRecord(value) || !isValidId(value.id)) return null
  if (typeof value.activity !== 'string' || typeof value.skill !== 'string') return null
  if (!Number.isInteger(value.plannedDurationMinutes) || Number(value.plannedDurationMinutes) < 5 || Number(value.plannedDurationMinutes) > 480) return null
  if (!Number.isFinite(value.startedAt) || !Number.isFinite(value.endsAt) || Number(value.endsAt) <= Number(value.startedAt)) return null
  return {
    id: value.id,
    mountainId: isValidId(value.mountainId) ? value.mountainId : 'mountain-001',
    activity: value.activity.slice(0, 80),
    skill: value.skill.slice(0, 80),
    plannedDurationMinutes: Number(value.plannedDurationMinutes),
    startedAt: Number(value.startedAt),
    endsAt: Number(value.endsAt),
    ...(Number.isFinite(value.pausedAt) && Number(value.pausedAt) >= Number(value.startedAt) ? { pausedAt: Number(value.pausedAt) } : {}),
    gearBonuses: normalizeGearBonuses(value.gearBonuses),
  }
}

function parseRecord(value: unknown): SessionRecord | null {
  const parsed = parseActive(value)
  if (!parsed || !isRecord(value) || !Number.isFinite(value.endedAt) || !Number.isInteger(value.actualDurationSeconds) || Number(value.actualDurationSeconds) < 0) return null
  return {
    ...withoutPause(parsed),
    endedAt: Number(value.endedAt),
    actualDurationSeconds: Number(value.actualDurationSeconds),
    // Older local history entries were completed sessions.
    outcome: value.outcome === 'abandoned' ? 'abandoned' : 'completed',
    skillXpLost: Number.isInteger(value.skillXpLost) && Number(value.skillXpLost) > 0 ? Math.min(10_000_000, Number(value.skillXpLost)) : 0,
  }
}

export function loadSessionData(storage?: StorageLike): { data: SessionData; warning?: string } {
  const target = storage ?? browserStorage()
  if (!target) return { data: { ...EMPTY_SESSION_DATA, history: [] } }
  try {
    const raw = target.getItem(SESSION_STORAGE_KEY)
    if (!raw) return { data: { ...EMPTY_SESSION_DATA, history: [] } }
    const value: unknown = JSON.parse(raw)
    if (!isRecord(value) || (value.version !== 1 && value.version !== 2) || !Array.isArray(value.history)) throw new Error('Invalid session data')
    const active = value.active === null ? null : parseActive(value.active)
    if (value.active !== null && !active) throw new Error('Invalid active session')
    const history = value.history.map(parseRecord)
    if (history.some((record) => record === null)) throw new Error('Invalid session history')
    const pendingSummaryId = value.pendingSummaryId === null || value.pendingSummaryId === undefined ? null : isValidId(value.pendingSummaryId) ? value.pendingSummaryId : null
    return { data: { version: 2, active, history: history as SessionRecord[], pendingSummaryId } }
  } catch {
    return { data: { ...EMPTY_SESSION_DATA, history: [] }, warning: 'Les données de session locales sont illisibles. Elles n’ont pas été remplacées automatiquement.' }
  }
}

export function saveSessionData(data: SessionData, storage?: StorageLike): boolean {
  const target = storage ?? browserStorage()
  if (!target) return false
  try {
    target.setItem(SESSION_STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function startSession(data: SessionData, input: { activity: string; skill: string; durationMinutes: number; mountainId?: string; gearBonuses?: GearBonuses }, now = Date.now()): SessionData {
  if (data.active) return data
  const requestedDuration = Number.isFinite(input.durationMinutes) ? input.durationMinutes : 25
  const duration = Math.max(5, Math.min(480, Math.round(requestedDuration / 5) * 5))
  const active: ActiveSession = {
    id: makeId(),
    mountainId: input.mountainId ?? 'mountain-001',
    activity: input.activity.trim().slice(0, 80),
    skill: input.skill.trim().slice(0, 80),
    plannedDurationMinutes: duration,
    startedAt: now,
    endsAt: now + duration * 60_000,
    gearBonuses: normalizeGearBonuses(input.gearBonuses),
  }
  return { ...data, active, pendingSummaryId: null }
}

export function completeActiveSession(data: SessionData, now = Date.now()): SessionData {
  const active = data.active
  if (!active) return data
  const existing = data.history.some((record) => record.id === active.id)
  if (existing) return { ...data, active: null }
  const endedAt = Math.max(active.startedAt, Math.min(active.pausedAt ?? now, active.endsAt))
  const actualDurationSeconds = Math.max(0, Math.floor((endedAt - active.startedAt) / 1000))
  const record: SessionRecord = { ...withoutPause(active), endedAt, actualDurationSeconds, outcome: 'completed', skillXpLost: 0 }
  return { ...data, active: null, history: [record, ...data.history], pendingSummaryId: record.id }
}

/** Saves real elapsed time while returning expedition progress to the last completed-session checkpoint. */
export function abandonActiveSession(data: SessionData, now = Date.now(), skillXpLost = 0): SessionData {
  const active = data.active
  if (!active) return data
  const existing = data.history.some((record) => record.id === active.id)
  if (existing) return { ...data, active: null }
  const endedAt = Math.max(active.startedAt, Math.min(active.pausedAt ?? now, active.endsAt))
  const actualDurationSeconds = Math.max(0, Math.floor((endedAt - active.startedAt) / 1000))
  const currentSkillXp = Math.max(0, data.history.reduce((total, session) => {
    if (session.activity !== active.activity) return total
    if (session.outcome !== 'completed') return total - session.skillXpLost
    const xpBonus = normalizeGearBonuses(session.gearBonuses).skillXpPercent
    return total + Math.floor(session.actualDurationSeconds * (1 + xpBonus / 100) / 60)
  }, 0))
  const boundedSkillLoss = Math.min(currentSkillXp, Math.max(0, Math.min(10_000_000, Math.floor(skillXpLost))))
  const record: SessionRecord = { ...withoutPause(active), endedAt, actualDurationSeconds, outcome: 'abandoned', skillXpLost: boundedSkillLoss }
  return { ...data, active: null, history: [record, ...data.history], pendingSummaryId: record.id }
}

/** A paused session never completes by itself: its clock is frozen. */
export function reconcileSessionData(data: SessionData, now = Date.now()): SessionData {
  return data.active && data.active.pausedAt === undefined && now >= data.active.endsAt ? completeActiveSession(data, data.active.endsAt) : data
}

export function finishSession(data: SessionData, now = Date.now()): SessionData {
  const active = data.active
  if (active && (active.pausedAt !== undefined || now < active.endsAt)) return abandonActiveSession(data, now)
  return completeActiveSession(data, now)
}

export function isSessionPaused(session: ActiveSession): boolean {
  return session.pausedAt !== undefined
}

/** Freezes the clock. The time worked so far is kept exactly as it is. */
export function pauseSession(data: SessionData, now = Date.now()): SessionData {
  const active = data.active
  if (!active || active.pausedAt !== undefined || now >= active.endsAt) return data
  return { ...data, active: { ...active, pausedAt: Math.max(active.startedAt, now) } }
}

/** Restarts the clock by shifting the schedule by the time spent paused, so paused time is never counted as work. */
export function resumeSession(data: SessionData, now = Date.now()): SessionData {
  const active = data.active
  if (!active || active.pausedAt === undefined) return data
  const pausedFor = Math.max(0, now - active.pausedAt)
  return { ...data, active: { ...withoutPause(active), startedAt: active.startedAt + pausedFor, endsAt: active.endsAt + pausedFor } }
}

export function dismissSessionSummary(data: SessionData, id: string): SessionData {
  return data.pendingSummaryId === id ? { ...data, pendingSummaryId: null } : data
}

export function getSessionElapsedSeconds(session: ActiveSession, now = Date.now()): number {
  const reference = session.pausedAt ?? now
  return Math.max(0, Math.min(session.plannedDurationMinutes * 60, Math.floor((reference - session.startedAt) / 1000)))
}

export function getSessionRemainingSeconds(session: ActiveSession, now = Date.now()): number {
  return Math.max(0, session.plannedDurationMinutes * 60 - getSessionElapsedSeconds(session, now))
}

/** mm:ss for a countdown (h:mm:ss beyond one hour). */
export function formatCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, Math.ceil(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const rest = safeSeconds % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(rest).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainingSeconds = safeSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}
