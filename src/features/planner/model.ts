export interface ScheduleBlock {
  id: string
  title: string
  activity: string
  date: string
  startMinute: number
  durationMinutes: number
  repeatDays: number[]
}

export interface PlannerTask {
  id: string
  title: string
  createdAt: string
  /** Day the task is planned for (YYYY-MM-DD). */
  date: string
  /** Weekdays (0 = Sunday … 6 = Saturday) on which the task comes back every week. Empty = one-off task. */
  repeatDays: number[]
  /** Days (YYYY-MM-DD) on which the task has been ticked off. */
  doneDates: string[]
}

export interface DayTemplate {
  id: string
  name: string
  blocks: Array<Pick<ScheduleBlock, 'title' | 'activity' | 'startMinute' | 'durationMinutes'>>
}

export interface PlannerData {
  version: 1
  blocks: ScheduleBlock[]
  tasks: PlannerTask[]
  templates: DayTemplate[]
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const PLANNER_STORAGE_KEY = 'ascension.planner.v1'
export const EMPTY_PLANNER: PlannerData = { version: 1, blocks: [], tasks: [], templates: [] }
export const DAY_START_MINUTE = 4 * 60
export const DAY_END_MINUTE = 24 * 60
export const MINUTE_HEIGHT = 1.1
/** Height in px of the whole day timeline (from DAY_START_MINUTE to DAY_END_MINUTE). */
export const TIMELINE_HEIGHT = Math.round((DAY_END_MINUTE - DAY_START_MINUTE) * MINUTE_HEIGHT)

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isValidId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length < 100
const isValidDateKey = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime()) && dateKey(date) === value
}

function getBrowserStorage(): StorageLike | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

export function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function fromDateKey(key: string): Date {
  return new Date(`${key}T12:00:00`)
}

export function addDays(key: string, amount: number): string {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + amount)
  return dateKey(date)
}

export function getWeekDates(key: string): string[] {
  const date = fromDateKey(key)
  const mondayOffset = (date.getDay() + 6) % 7
  const monday = addDays(key, -mondayOffset)
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

export function weekdayForDate(key: string): number {
  return fromDateKey(key).getDay()
}

export function occursOnDate(block: ScheduleBlock, key: string): boolean {
  if (key < block.date) return false
  if (block.repeatDays.length === 0) return key === block.date
  return block.repeatDays.includes(weekdayForDate(key))
}

export function getBlocksForDate(blocks: ScheduleBlock[], key: string): ScheduleBlock[] {
  return blocks.filter((block) => occursOnDate(block, key)).sort((a, b) => a.startMinute - b.startMinute || a.title.localeCompare(b.title, 'fr'))
}

/** A task shows on its own day, and on every later day whose weekday is one of its repeat days. */
export function taskOccursOnDate(task: PlannerTask, key: string): boolean {
  if (key === task.date) return true
  return key > task.date && task.repeatDays.includes(weekdayForDate(key))
}

export function isTaskDoneOn(task: PlannerTask, key: string): boolean {
  return task.doneDates.includes(key)
}

export function getTasksForDate(tasks: PlannerTask[], key: string): PlannerTask[] {
  return tasks.filter((task) => taskOccursOnDate(task, key))
}

/** Ticks a task off (or back on) for one day only: a repeated task stays open on its other days. */
export function toggleTaskOn(task: PlannerTask, key: string): PlannerTask {
  return { ...task, doneDates: isTaskDoneOn(task, key) ? task.doneDates.filter((day) => day !== key) : [...task.doneDates, key] }
}

const SHORT_WEEKDAYS: Record<number, string> = { 0: 'dim.', 1: 'lun.', 2: 'mar.', 3: 'mer.', 4: 'jeu.', 5: 'ven.', 6: 'sam.' }

/** "lun., mer." — repeat days in week order (Monday first), for the interface. */
export function describeRepeatDays(days: number[]): string {
  return [1, 2, 3, 4, 5, 6, 0].filter((day) => days.includes(day)).map((day) => SHORT_WEEKDAYS[day]).join(' ')
}

export function getConflicts(blocks: ScheduleBlock[], candidate: Pick<ScheduleBlock, 'id' | 'date' | 'startMinute' | 'durationMinutes'>): ScheduleBlock[] {
  const end = candidate.startMinute + candidate.durationMinutes
  return getBlocksForDate(blocks, candidate.date).filter((block) => {
    if (block.id === candidate.id) return false
    const otherEnd = block.startMinute + block.durationMinutes
    return candidate.startMinute < otherEnd && block.startMinute < end
  })
}

export interface TimelineBlock extends ScheduleBlock {
  lane: number
  laneCount: number
}

export function layoutTimeline(blocks: ScheduleBlock[]): TimelineBlock[] {
  const sorted = [...blocks].sort((a, b) => a.startMinute - b.startMinute || a.durationMinutes - b.durationMinutes)
  const result: TimelineBlock[] = []
  let cluster: ScheduleBlock[] = []
  let clusterEnd = -1

  const flushCluster = () => {
    if (cluster.length === 0) return
    const laneEnds: number[] = []
    const laidOut: Array<{ block: ScheduleBlock; lane: number }> = []
    for (const block of cluster) {
      let lane = laneEnds.findIndex((end) => end <= block.startMinute)
      if (lane === -1) lane = laneEnds.length
      laneEnds[lane] = block.startMinute + block.durationMinutes
      laidOut.push({ block, lane })
    }
    for (const item of laidOut) result.push({ ...item.block, lane: item.lane, laneCount: laneEnds.length })
    cluster = []
    clusterEnd = -1
  }

  for (const block of sorted) {
    if (cluster.length > 0 && block.startMinute >= clusterEnd) flushCluster()
    cluster.push(block)
    clusterEnd = Math.max(clusterEnd, block.startMinute + block.durationMinutes)
  }
  flushCluster()
  return result.sort((a, b) => a.startMinute - b.startMinute || a.lane - b.lane)
}

export function formatTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(DAY_END_MINUTE - 1, minutes))
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

export function parseTime(value: string): number | undefined {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return undefined
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return undefined
  return hour * 60 + minute
}

function parseBlock(value: unknown): ScheduleBlock | undefined {
  if (!isRecord(value)) return undefined
  if (!isValidId(value.id) || typeof value.title !== 'string' || typeof value.activity !== 'string' || !isValidDateKey(value.date)) return undefined
  if (!Number.isInteger(value.startMinute) || Number(value.startMinute) < 0 || Number(value.startMinute) > 1439) return undefined
  if (!Number.isInteger(value.durationMinutes) || Number(value.durationMinutes) < 15 || Number(value.durationMinutes) > 720) return undefined
  if (!Array.isArray(value.repeatDays) || !value.repeatDays.every((day) => Number.isInteger(day) && Number(day) >= 0 && Number(day) <= 6)) return undefined
  return {
    id: value.id,
    title: value.title.slice(0, 120),
    activity: value.activity.slice(0, 50),
    date: value.date,
    startMinute: Number(value.startMinute),
    durationMinutes: Number(value.durationMinutes),
    repeatDays: [...new Set(value.repeatDays as number[])],
  }
}

function parseTask(value: unknown): PlannerTask | undefined {
  if (!isRecord(value) || !isValidId(value.id) || typeof value.title !== 'string' || typeof value.createdAt !== 'string') return undefined
  // Tasks saved before days existed only have `done` and `createdAt`: they stay on the day they were created.
  const created = new Date(value.createdAt)
  const date = isValidDateKey(value.date) ? value.date : Number.isNaN(created.getTime()) ? dateKey(new Date()) : dateKey(created)
  const repeatDays = Array.isArray(value.repeatDays) ? [...new Set(value.repeatDays.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6))] : []
  const doneDates = Array.isArray(value.doneDates) ? [...new Set(value.doneDates.filter(isValidDateKey))] : value.done === true ? [date] : []
  return { id: value.id, title: value.title.slice(0, 240), createdAt: value.createdAt, date, repeatDays, doneDates }
}

function parseTemplate(value: unknown): DayTemplate | undefined {
  if (!isRecord(value) || !isValidId(value.id) || typeof value.name !== 'string' || !Array.isArray(value.blocks)) return undefined
  const blocks = value.blocks.filter(isRecord).filter((block) => typeof block.title === 'string' && typeof block.activity === 'string' && Number.isInteger(block.startMinute) && Number.isInteger(block.durationMinutes)).map((block) => ({
    title: String(block.title).slice(0, 120),
    activity: String(block.activity).slice(0, 50),
    startMinute: Number(block.startMinute),
    durationMinutes: Number(block.durationMinutes),
  }))
  return { id: value.id, name: value.name.slice(0, 60), blocks }
}

export function loadPlannerData(storage?: StorageLike): { data: PlannerData; warning?: string } {
  const target = storage ?? getBrowserStorage()
  if (!target) return { data: { ...EMPTY_PLANNER, blocks: [], tasks: [], templates: [] } }
  try {
    const raw = target.getItem(PLANNER_STORAGE_KEY)
    if (!raw) return { data: { ...EMPTY_PLANNER, blocks: [], tasks: [], templates: [] } }
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.blocks) || !Array.isArray(parsed.tasks)) throw new Error('Invalid planner data')
    return {
      data: {
        version: 1,
        blocks: parsed.blocks.map(parseBlock).filter((block): block is ScheduleBlock => Boolean(block)),
        tasks: parsed.tasks.map(parseTask).filter((task): task is PlannerTask => Boolean(task)),
        templates: Array.isArray(parsed.templates) ? parsed.templates.map(parseTemplate).filter((template): template is DayTemplate => Boolean(template)) : [],
      },
    }
  } catch {
    return {
      data: { ...EMPTY_PLANNER, blocks: [], tasks: [], templates: [] },
      warning: 'Les données locales sont illisibles. Elles n’ont pas été remplacées automatiquement.',
    }
  }
}

export function savePlannerData(data: PlannerData, storage?: StorageLike): boolean {
  const target = storage ?? getBrowserStorage()
  if (!target) return false
  try {
    target.setItem(PLANNER_STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}
