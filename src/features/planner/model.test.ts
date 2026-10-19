import { describe, expect, it } from 'vitest'
import {
  addDays,
  dateKey,
  describeRepeatDays,
  getBlocksForDate,
  getConflicts,
  getTasksForDate,
  getWeekDates,
  isTaskDoneOn,
  layoutTimeline,
  loadPlannerData,
  parseTime,
  savePlannerData,
  taskOccursOnDate,
  toggleTaskOn,
  type PlannerData,
  type PlannerTask,
  type ScheduleBlock,
} from './model'

const block = (id: string, startMinute: number, durationMinutes: number, date = '2026-10-19', repeatDays: number[] = []): ScheduleBlock => ({
  id,
  title: id,
  activity: 'Études',
  date,
  startMinute,
  durationMinutes,
  repeatDays,
})

describe('dates et agenda', () => {
  it('avance les jours calendaires sans dérive UTC', () => {
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25')
    expect(dateKey(new Date(2026, 9, 25, 1))).toBe('2026-10-25')
  })

  it('retourne une semaine du lundi au dimanche', () => {
    expect(getWeekDates('2026-10-21')).toEqual([
      '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
    ])
  })

  it('développe une répétition hebdomadaire à partir de sa date de départ', () => {
    const recurring = block('maths', 540, 90, '2026-10-19', [1, 3])
    expect(getBlocksForDate([recurring], '2026-10-21')).toHaveLength(1)
    expect(getBlocksForDate([recurring], '2026-10-20')).toHaveLength(0)
    expect(getBlocksForDate([recurring], '2026-10-18')).toHaveLength(0)
  })

  it('détecte seulement les chevauchements stricts', () => {
    const existing = block('maths', 540, 90)
    expect(getConflicts([existing], block('physics', 600, 60))).toHaveLength(1)
    expect(getConflicts([existing], block('english', 630, 30))).toHaveLength(0)
  })

  it('place les blocs simultanés dans des colonnes distinctes', () => {
    const layout = layoutTimeline([block('a', 540, 90), block('b', 570, 30), block('c', 630, 30)])
    expect(layout.find((item) => item.id === 'a')?.laneCount).toBe(2)
    expect(layout.find((item) => item.id === 'b')?.lane).not.toBe(layout.find((item) => item.id === 'a')?.lane)
    expect(layout.find((item) => item.id === 'c')?.laneCount).toBe(1)
  })

  it('rejette les heures hors format et les minutes impossibles', () => {
    expect(parseTime('08:45')).toBe(525)
    expect(parseTime('24:00')).toBeUndefined()
    expect(parseTime('12:90')).toBeUndefined()
  })
})

describe('sauvegarde locale du planning', () => {
  it('sauvegarde et recharge blocs, tâches et modèles', () => {
    const values = new Map<string, string>()
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
    const data: PlannerData = {
      version: 1,
      blocks: [block('read', 900, 60)],
      tasks: [{ id: 'task-1', title: 'Relire mes notes', createdAt: '2026-10-18T10:00:00.000Z', date: '2026-10-19', repeatDays: [1, 3], doneDates: ['2026-10-19'] }],
      templates: [{ id: 'template-1', name: 'Révision', blocks: [{ title: 'Mathématiques', activity: 'Mathématiques', startMinute: 540, durationMinutes: 90 }] }],
    }
    expect(savePlannerData(data, storage)).toBe(true)
    expect(loadPlannerData(storage).data).toEqual(data)
  })

  it('préserve le stockage illisible au lieu de l’écraser', () => {
    let saved = '{invalid json'
    const storage = { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value } }
    const result = loadPlannerData(storage)
    expect(result.warning).toBeTruthy()
    expect(saved).toBe('{invalid json')
  })
})

describe('tâches par jour', () => {
  const task = (repeatDays: number[] = [], doneDates: string[] = []): PlannerTask => ({ id: 't', title: 'Réviser', createdAt: '2026-10-19T08:00:00.000Z', date: '2026-10-19', repeatDays, doneDates })

  it('une tâche sans répétition ne vit que le jour choisi', () => {
    expect(taskOccursOnDate(task(), '2026-10-19')).toBe(true)
    expect(taskOccursOnDate(task(), '2026-10-20')).toBe(false)
    expect(taskOccursOnDate(task(), '2026-10-26')).toBe(false)
  })

  it('une tâche répétée revient les jours choisis, jamais avant sa création', () => {
    const repeated = task([3])
    expect(taskOccursOnDate(repeated, '2026-10-19')).toBe(true)
    expect(taskOccursOnDate(repeated, '2026-10-21')).toBe(true)
    expect(taskOccursOnDate(repeated, '2026-10-28')).toBe(true)
    expect(taskOccursOnDate(repeated, '2026-10-22')).toBe(false)
    expect(taskOccursOnDate(repeated, '2026-10-14')).toBe(false)
    expect(getTasksForDate([repeated, task()], '2026-10-21')).toHaveLength(1)
  })

  it('terminer une tâche répétée ne la termine que pour ce jour', () => {
    const repeated = task([1])
    const ticked = toggleTaskOn(repeated, '2026-10-19')
    expect(isTaskDoneOn(ticked, '2026-10-19')).toBe(true)
    expect(isTaskDoneOn(ticked, '2026-10-26')).toBe(false)
    expect(isTaskDoneOn(toggleTaskOn(ticked, '2026-10-19'), '2026-10-19')).toBe(false)
  })

  it('écrit les jours de répétition dans l’ordre de la semaine', () => {
    expect(describeRepeatDays([0, 3, 1])).toBe('lun. mer. dim.')
  })

  it('range les anciennes tâches sans jour sur leur jour de création', () => {
    const values = new Map<string, string>([['ascension.planner.v1', JSON.stringify({ version: 1, blocks: [], templates: [], tasks: [
      { id: 'old-open', title: 'Ancienne', done: false, createdAt: '2026-10-18T10:00:00' },
      { id: 'old-done', title: 'Faite', done: true, createdAt: '2026-10-17T10:00:00' },
    ] })]])
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
    const tasks = loadPlannerData(storage).data.tasks
    expect(tasks[0].date).toBe('2026-10-18')
    expect(tasks[0].doneDates).toEqual([])
    expect(tasks[1].date).toBe('2026-10-17')
    expect(tasks[1].doneDates).toEqual(['2026-10-17'])
    expect(tasks[1].repeatDays).toEqual([])
  })
})
