import { useState, type FormEvent } from 'react'
import { Icon } from '../../components/Icon'
import {
  addDays,
  dateKey,
  describeRepeatDays,
  fromDateKey,
  getTasksForDate,
  getWeekDates,
  isTaskDoneOn,
  makeId,
  toggleTaskOn,
  type PlannerData,
  type PlannerTask,
} from '../planner/model'

type Filter = 'pending' | 'done' | 'all'

const weekdayChoices = [1, 2, 3, 4, 5, 6, 0]
const dayInitials: Record<number, string> = { 0: 'D', 1: 'L', 2: 'M', 3: 'M', 4: 'J', 5: 'V', 6: 'S' }
const dayNames: Record<number, string> = { 0: 'dimanche', 1: 'lundi', 2: 'mardi', 3: 'mercredi', 4: 'jeudi', 5: 'vendredi', 6: 'samedi' }

function dayTitle(key: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }) {
  return new Intl.DateTimeFormat('fr-FR', options).format(fromDateKey(key))
}

/** The small "repeat on these days" setting, shared by the new-task form and the edit form. */
function RepeatPicker({ value, onChange }: { value: number[]; onChange: (next: number[]) => void }) {
  const toggle = (day: number) => onChange(value.includes(day) ? value.filter((item) => item !== day) : [...value, day])
  return <div className="task-repeat" role="group" aria-label="Répéter la tâche chaque semaine">
    <span className="task-repeat-label">RÉPÉTER</span>
    <div className="weekday-picker">{weekdayChoices.map((day) => <button key={day} type="button" className={value.includes(day) ? 'selected' : ''} aria-pressed={value.includes(day)} aria-label={`Répéter le ${dayNames[day]}`} onClick={() => toggle(day)}>{dayInitials[day]}</button>)}</div>
    <small>{value.length > 0 ? `Revient chaque semaine : ${describeRepeatDays(value)}` : 'Facultatif : choisis des jours pour la refaire chaque semaine.'}</small>
  </div>
}

export function TasksView({ data, onChange }: { data: PlannerData; onChange: (next: PlannerData) => void }) {
  const today = dateKey(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [filter, setFilter] = useState<Filter>('pending')
  const [draft, setDraft] = useState('')
  const [draftRepeat, setDraftRepeat] = useState<number[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingRepeat, setEditingRepeat] = useState<number[]>([])

  const weekDates = getWeekDates(selectedDate)
  const dayTasks = getTasksForDate(data.tasks, selectedDate)
  const visible = dayTasks.filter((task) => filter === 'all' || (filter === 'done' ? isTaskDoneOn(task, selectedDate) : !isTaskDoneOn(task, selectedDate)))

  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = draft.trim()
    if (!title) return
    const task: PlannerTask = { id: makeId(), title: title.slice(0, 240), createdAt: new Date().toISOString(), date: selectedDate, repeatDays: draftRepeat, doneDates: [] }
    onChange({ ...data, tasks: [task, ...data.tasks] })
    setDraft('')
    setDraftRepeat([])
  }

  const toggleTask = (id: string) => onChange({ ...data, tasks: data.tasks.map((task) => task.id === id ? toggleTaskOn(task, selectedDate) : task) })
  const deleteTask = (id: string) => onChange({ ...data, tasks: data.tasks.filter((task) => task.id !== id) })

  const saveEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = editingTitle.trim()
    if (!editingId || !title) return
    onChange({ ...data, tasks: data.tasks.map((task) => task.id === editingId ? { ...task, title: title.slice(0, 240), repeatDays: editingRepeat } : task) })
    setEditingId(null)
    setEditingTitle('')
  }

  return <div className="page-content tasks-page">
      <div className="page-heading planner-heading">
      <div><div className="eyebrow"><span className="eyebrow-line" />LISTE DE BORD</div><h1>Tâches</h1></div>
    </div>

    <div className="planner-controls tasks-controls">
      <div className="date-controls">
        <button className="date-arrow" aria-label="Jour précédent" onClick={() => setSelectedDate(addDays(selectedDate, -1))}><Icon name="chevronLeft" size={17} /></button>
        <span className="date-range">{dayTitle(selectedDate)}</span>
        <button className="date-arrow" aria-label="Jour suivant" onClick={() => setSelectedDate(addDays(selectedDate, 1))}><Icon name="chevronRight" size={17} /></button>
        <button className="today-button" onClick={() => setSelectedDate(today)}>Aujourd’hui</button>
      </div>
    </div>

    <section className="tasks-card">
      <div className="task-days" role="group" aria-label="Choisir le jour de la semaine">{weekDates.map((key) => {
        const pending = getTasksForDate(data.tasks, key).filter((task) => !isTaskDoneOn(task, key)).length
        return <button key={key} className={`task-day ${key === today ? 'is-today' : ''}`} aria-pressed={key === selectedDate} aria-label={`${dayTitle(key)}${pending > 0 ? `, ${pending} à faire` : ''}`} onClick={() => setSelectedDate(key)}>
          <span>{dayTitle(key, { weekday: 'short' }).replace('.', '')}</span><strong>{fromDateKey(key).getDate()}</strong><small>{pending > 0 ? pending : ''}</small>
        </button>
      })}</div>

      <form className="new-task-form" onSubmit={addTask}><span className="task-input-icon"><Icon name="plus" size={18} /></span><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Nouvelle tâche…" aria-label={`Nouvelle tâche pour ${dayTitle(selectedDate)}`} maxLength={240} /><button type="submit" disabled={!draft.trim()}>Ajouter <Icon name="arrow" size={15} /></button><RepeatPicker value={draftRepeat} onChange={setDraftRepeat} /></form>

      <div className="task-list-head"><div><span className="section-label">{selectedDate === today ? 'AUJOURD’HUI' : 'LISTE DU JOUR'}</span><h2>{dayTitle(selectedDate)}</h2></div><div className="task-filters" role="tablist" aria-label="Filtrer les tâches"><button role="tab" aria-selected={filter === 'pending'} className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>En cours</button><button role="tab" aria-selected={filter === 'done'} className={filter === 'done' ? 'active' : ''} onClick={() => setFilter('done')}>Terminées</button><button role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Toutes</button></div></div>

      {visible.length === 0 ? <div className="tasks-empty"><div className="tasks-empty-icon"><Icon name={filter === 'done' ? 'check' : 'mountain'} size={24} /></div><strong>{filter === 'done' ? 'Aucune tâche terminée ce jour-là.' : filter === 'all' ? 'Aucune tâche ce jour-là.' : 'Rien à faire ce jour-là.'}</strong><p>{filter === 'pending' ? 'Ajoute une tâche avec le champ ci-dessus : elle sera rangée sur ce jour.' : 'Les tâches correspondantes apparaîtront ici.'}</p></div> : <ul className="task-list">{visible.map((task) => {
        const done = isTaskDoneOn(task, selectedDate)
        return <li className={`task-row ${done ? 'completed' : ''}`} key={task.id}>
        <button className={`task-check ${done ? 'checked' : ''}`} aria-label={done ? `Marquer ${task.title} comme à faire` : `Terminer ${task.title}`} onClick={() => toggleTask(task.id)}>{done && <Icon name="check" size={14} />}</button>
        {editingId === task.id ? <form className="task-edit-form" onSubmit={saveEdit}><input autoFocus value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} aria-label="Modifier le titre de la tâche" maxLength={240} /><button type="submit" aria-label="Enregistrer la tâche"><Icon name="check" size={16} /></button><button type="button" aria-label="Annuler la modification" onClick={() => setEditingId(null)}><Icon name="close" size={16} /></button><RepeatPicker value={editingRepeat} onChange={setEditingRepeat} /></form> : <><div className="task-main"><span className="task-title">{task.title}</span>{task.repeatDays.length > 0 && <small className="task-tag">Chaque {describeRepeatDays(task.repeatDays)}</small>}</div><div className="task-row-actions"><button aria-label={`Modifier ${task.title}`} onClick={() => { setEditingId(task.id); setEditingTitle(task.title); setEditingRepeat(task.repeatDays) }}><Icon name="edit" size={15} /></button><button aria-label={task.repeatDays.length > 0 ? `Supprimer ${task.title} sur tous les jours` : `Supprimer ${task.title}`} onClick={() => deleteTask(task.id)}><Icon name="trash" size={15} /></button></div></>}
      </li>
      })}</ul>}
    </section>

    <div className="tasks-note"><Icon name="spark" size={16} /><span>Une tâche répétée se coche jour par jour. La supprimer l’enlève de tous ses jours.</span></div>
  </div>
}
