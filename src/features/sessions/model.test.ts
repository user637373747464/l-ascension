import { describe, expect, it } from 'vitest'
import {
  completeActiveSession,
  abandonActiveSession,
  finishSession,
  formatCountdown,
  getSessionElapsedSeconds,
  getSessionRemainingSeconds,
  isSessionPaused,
  loadSessionData,
  pauseSession,
  reconcileSessionData,
  resumeSession,
  saveSessionData,
  startSession,
  type SessionData,
} from './model'

describe('sessions de travail', () => {
  it('crée une session datée avec une durée arrondie aux cinq minutes', () => {
    const started = startSession({ version: 2, active: null, history: [], pendingSummaryId: null }, { activity: 'Mathématiques', skill: 'Concentration', durationMinutes: 33 }, 10_000)
    expect(started.active?.startedAt).toBe(10_000)
    expect(started.active?.plannedDurationMinutes).toBe(35)
    expect(started.active?.endsAt).toBe(10_000 + 35 * 60_000)
  })

  it('calcule le temps depuis les dates et s’arrête à l’objectif prévu', () => {
    const state = startSession({ version: 2, active: null, history: [], pendingSummaryId: null }, { activity: 'Physique', skill: 'Science', durationMinutes: 25 }, 1_000)
    expect(getSessionElapsedSeconds(state.active!, 61_000)).toBe(60)
    expect(getSessionElapsedSeconds(state.active!, 5_000_000)).toBe(25 * 60)
  })

  it('clôture une session échue à la durée prévue et ne l’enregistre qu’une fois', () => {
    const initial = startSession({ version: 2, active: null, history: [], pendingSummaryId: null }, { activity: 'Lecture', skill: 'Régularité', durationMinutes: 15 }, 20_000)
    const ended = reconcileSessionData(initial, 20_000 + 30 * 60_000)
    expect(ended.active).toBeNull()
    expect(ended.history).toHaveLength(1)
    expect(ended.history[0].actualDurationSeconds).toBe(15 * 60)
    expect(ended.pendingSummaryId).toBe(initial.active?.id)
    expect(completeActiveSession(ended, 20_000 + 31 * 60_000)).toBe(ended)
  })

  it('conserve le temps réellement fait lors d’un arrêt volontaire', () => {
    const initial = startSession({ version: 2, active: null, history: [], pendingSummaryId: null }, { activity: 'Informatique', skill: 'Logique', durationMinutes: 45 }, 5_000)
    const ended = finishSession(initial, 5_000 + 7 * 60_000 + 4_000)
    expect(ended.history[0].actualDurationSeconds).toBe(7 * 60 + 4)
    expect(ended.history[0].outcome).toBe('abandoned')
    expect(finishSession(ended, 5_000 + 8 * 60_000)).toBe(ended)
  })

  it('garde une session interrompue dans le carnet sans la confondre avec un sommet validé', () => {
    const initial = startSession({ version: 2, active: null, history: [], pendingSummaryId: null }, { activity: 'Mathématiques', skill: 'Concentration', durationMinutes: 25 }, 10_000)
    const abandoned = abandonActiveSession(initial, 10_000 + 6 * 60_000)
    expect(abandoned.history[0]).toMatchObject({ actualDurationSeconds: 360, outcome: 'abandoned' })
    expect(abandoned.pendingSummaryId).toBe(initial.active?.id)
  })

  it('évite une durée négative si l’horloge système recule', () => {
    const initial = startSession({ version: 2, active: null, history: [], pendingSummaryId: null }, { activity: 'Anglais', skill: 'Langues', durationMinutes: 20 }, 50_000)
    const ended = finishSession(initial, 10_000)
    expect(ended.history[0].actualDurationSeconds).toBe(0)
    expect(ended.history[0].endedAt).toBe(50_000)
  })
})

describe('pause et reprise', () => {
  const empty: SessionData = { version: 2, active: null, history: [], pendingSummaryId: null }

  it('fige le temps pendant la pause puis le reprend sans compter la pause comme du travail', () => {
    const started = startSession(empty, { activity: 'Mathématiques', skill: 'Concentration', durationMinutes: 25 }, 0)
    const paused = pauseSession(started, 10 * 60_000)
    expect(isSessionPaused(paused.active!)).toBe(true)
    expect(getSessionElapsedSeconds(paused.active!, 10 * 60_000)).toBe(600)
    expect(getSessionElapsedSeconds(paused.active!, 40 * 60_000)).toBe(600)
    expect(getSessionRemainingSeconds(paused.active!, 40 * 60_000)).toBe(15 * 60)
    const resumed = resumeSession(paused, 30 * 60_000)
    expect(isSessionPaused(resumed.active!)).toBe(false)
    expect(resumed.active?.endsAt).toBe(45 * 60_000)
    expect(getSessionElapsedSeconds(resumed.active!, 30 * 60_000)).toBe(600)
    expect(getSessionElapsedSeconds(resumed.active!, 35 * 60_000)).toBe(900)
  })

  it('ne termine jamais seule une session en pause', () => {
    const started = startSession(empty, { activity: 'Physique', skill: 'Rigueur', durationMinutes: 25 }, 0)
    const paused = pauseSession(started, 5 * 60_000)
    expect(reconcileSessionData(paused, 10 * 60 * 60_000)).toBe(paused)
  })

  it('enregistre le temps réellement travaillé quand on termine pendant une pause', () => {
    const started = startSession(empty, { activity: 'Informatique', skill: 'Logique', durationMinutes: 25 }, 0)
    const paused = pauseSession(started, 7 * 60_000)
    const ended = finishSession(paused, 3 * 60 * 60_000)
    expect(ended.history[0]).toMatchObject({ actualDurationSeconds: 7 * 60, outcome: 'abandoned', endedAt: 7 * 60_000 })
    expect(ended.history[0].pausedAt).toBeUndefined()
  })

  it('termine à la durée prévue après une reprise', () => {
    const started = startSession(empty, { activity: 'Anglais', skill: 'Communication', durationMinutes: 25 }, 0)
    const resumed = resumeSession(pauseSession(started, 10 * 60_000), 20 * 60_000)
    const done = reconcileSessionData(resumed, resumed.active!.endsAt)
    expect(done.history[0]).toMatchObject({ outcome: 'completed', actualDurationSeconds: 25 * 60 })
  })

  it('ignore une pause répétée ou une reprise sans pause', () => {
    const started = startSession(empty, { activity: 'Sport', skill: 'Endurance', durationMinutes: 25 }, 0)
    expect(resumeSession(started, 1000)).toBe(started)
    const paused = pauseSession(started, 1000)
    expect(pauseSession(paused, 2000)).toBe(paused)
  })

  it('conserve la pause après rechargement', () => {
    const values = new Map<string, string>()
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
    const paused = pauseSession(startSession(empty, { activity: 'Anglais', skill: 'Communication', durationMinutes: 25 }, 40_000), 100_000)
    saveSessionData(paused, storage)
    expect(loadSessionData(storage).data.active?.pausedAt).toBe(100_000)
  })

  it('affiche le compte à rebours en mm:ss', () => {
    expect(formatCountdown(25 * 60)).toBe('25:00')
    expect(formatCountdown(59.2)).toBe('01:00')
    expect(formatCountdown(0)).toBe('00:00')
    expect(formatCountdown(3725)).toBe('1:02:05')
  })
})

describe('sauvegarde des sessions', () => {
  it('conserve une session active après rechargement', () => {
    const values = new Map<string, string>()
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
    const data: SessionData = startSession({ version: 2, active: null, history: [], pendingSummaryId: null }, { activity: 'Anglais', skill: 'Communication', durationMinutes: 25 }, 40_000)
    expect(saveSessionData(data, storage)).toBe(true)
    expect(loadSessionData(storage).data).toEqual(data)
  })

  it('préserve un stockage illisible au lieu de l’écraser', () => {
    let saved = '{invalid json'
    const storage = { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value } }
    expect(loadSessionData(storage).warning).toBeTruthy()
    expect(saved).toBe('{invalid json')
  })

  it('migre une session active au format v1 sans perdre son chronomètre', () => {
    const storage = { getItem: () => JSON.stringify({ version: 1, active: { id: 'old-session', activity: 'Mathématiques', skill: 'Concentration', plannedDurationMinutes: 25, startedAt: 1000, endsAt: 1_501_000 }, history: [], pendingSummaryId: null }), setItem: () => undefined }
    const loaded = loadSessionData(storage).data
    expect(loaded.version).toBe(2)
    expect(loaded.active?.mountainId).toBe('mountain-001')
    expect(loaded.active?.endsAt).toBe(1_501_000)
  })
})
