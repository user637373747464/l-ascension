import { useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent } from 'react'
import { Icon } from '../../components/Icon'
import {
  addDays,
  DAY_END_MINUTE,
  DAY_START_MINUTE,
  dateKey,
  formatTime,
  fromDateKey,
  getBlocksForDate,
  getConflicts,
  getWeekDates,
  layoutTimeline,
  makeId,
  MINUTE_HEIGHT,
  parseTime,
  TIMELINE_HEIGHT,
  weekdayForDate,
  type DayTemplate,
  type PlannerData,
  type ScheduleBlock,
} from '../planner/model'

type View = 'day' | 'week'
type BlockDraft = Pick<ScheduleBlock, 'title' | 'activity' | 'date' | 'startMinute' | 'durationMinutes' | 'repeatDays'>

const dayInitials: Record<number, string> = { 0: 'D', 1: 'L', 2: 'M', 3: 'M', 4: 'J', 5: 'V', 6: 'S' }
const weekdayChoices = [1, 2, 3, 4, 5, 6, 0]
const activities = ['Mathématiques', 'Physique', 'Informatique', 'Anglais', 'Sport', 'Autre']
const hours = Array.from({ length: (DAY_END_MINUTE - DAY_START_MINUTE) / 60 }, (_, index) => DAY_START_MINUTE + index * 60)

function dayTitle(key: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }) {
  return new Intl.DateTimeFormat('fr-FR', options).format(fromDateKey(key))
}

export function AgendaView({ data, onChange }: { data: PlannerData; onChange: (next: PlannerData) => void }) {
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const [view, setView] = useState<View>('day')
  const [editing, setEditing] = useState<ScheduleBlock | null | undefined>(undefined)
  const [copiedBlock, setCopiedBlock] = useState<ScheduleBlock | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [dragPreview, setDragPreview] = useState<{ id: string; startMinute: number } | null>(null)
  const dragRef = useRef<{ id: string; startMinute: number; durationMinutes: number; startY: number; moved: boolean } | null>(null)
  const didDragRef = useRef(false)

  const dates = useMemo(() => getWeekDates(selectedDate), [selectedDate])
  const today = dateKey(new Date())
  const visibleBlocks = useMemo(() => getBlocksForDate(data.blocks, selectedDate), [data.blocks, selectedDate])

  const openNew = (key = selectedDate) => {
    setSelectedDate(key)
    setEditing(null)
  }

  const saveBlock = (draft: BlockDraft, id?: string) => {
    const block: ScheduleBlock = { ...draft, id: id ?? makeId() }
    const blocks = id ? data.blocks.map((current) => current.id === id ? block : current) : [...data.blocks, block]
    onChange({ ...data, blocks })
    setEditing(undefined)
  }

  const removeBlock = (id: string) => {
    onChange({ ...data, blocks: data.blocks.filter((block) => block.id !== id) })
    setEditing(undefined)
  }

  const duplicateBlock = (block: ScheduleBlock) => {
    const startMinute = Math.min(block.startMinute + block.durationMinutes, DAY_END_MINUTE - block.durationMinutes)
    onChange({ ...data, blocks: [...data.blocks, { ...block, id: makeId(), date: selectedDate, startMinute, repeatDays: [] }] })
  }

  const pasteBlock = () => {
    if (!copiedBlock) return
    const pasted = { ...copiedBlock, id: makeId(), date: selectedDate, repeatDays: [] }
    onChange({ ...data, blocks: [...data.blocks, pasted] })
  }

  const saveDayTemplate = () => {
    if (visibleBlocks.length === 0) return
    const name = window.prompt('Nom du modèle de journée', 'Journée de révision')?.trim()
    if (!name) return
    const template: DayTemplate = {
      id: makeId(),
      name: name.slice(0, 60),
      blocks: visibleBlocks.map(({ title, activity, startMinute, durationMinutes }) => ({ title, activity, startMinute, durationMinutes })),
    }
    onChange({ ...data, templates: [...data.templates, template] })
  }

  const applyTemplate = () => {
    const template = data.templates.find((item) => item.id === selectedTemplate)
    if (!template) return
    const clones = template.blocks.map((block) => ({ ...block, id: makeId(), date: selectedDate, repeatDays: [] }))
    onChange({ ...data, blocks: [...data.blocks, ...clones] })
    setSelectedTemplate('')
  }

  const moveBlock = (id: string, startMinute: number) => {
    onChange({ ...data, blocks: data.blocks.map((block) => block.id === id ? { ...block, startMinute } : block) })
  }

  const handlePointerDown = (block: ScheduleBlock, event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    didDragRef.current = false
    dragRef.current = { id: block.id, startMinute: block.startMinute, durationMinutes: block.durationMinutes, startY: event.clientY, moved: false }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const rawDelta = (event.clientY - drag.startY) / MINUTE_HEIGHT
    const snappedDelta = Math.round(rawDelta / 15) * 15
    const nextMinute = Math.max(DAY_START_MINUTE, Math.min(DAY_END_MINUTE - drag.durationMinutes, drag.startMinute + snappedDelta))
    if (Math.abs(nextMinute - drag.startMinute) >= 15) drag.moved = true
    setDragPreview({ id: drag.id, startMinute: nextMinute })
  }

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (drag?.moved) {
      const rawDelta = (event.clientY - drag.startY) / MINUTE_HEIGHT
      const snappedDelta = Math.round(rawDelta / 15) * 15
      const nextMinute = Math.max(DAY_START_MINUTE, Math.min(DAY_END_MINUTE - drag.durationMinutes, drag.startMinute + snappedDelta))
      moveBlock(drag.id, nextMinute)
      didDragRef.current = true
    }
    dragRef.current = null
    setDragPreview(null)
  }

  const cancelDrag = () => {
    dragRef.current = null
    setDragPreview(null)
  }

  const shiftedSelectedDate = (amount: number) => setSelectedDate(addDays(selectedDate, amount))

  return (
    <div className="page-content planner-page">
      <div className="page-heading planner-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" />ORGANISATION</div><h1>Agenda</h1></div>
        <button className="primary-light-button" onClick={() => openNew()}><Icon name="plus" size={17} /> Créer un bloc</button>
      </div>

      <div className="planner-controls">
        <div className="view-switch" role="tablist" aria-label="Vue de l’agenda">
          <button role="tab" aria-selected={view === 'day'} className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}>Jour</button>
          <button role="tab" aria-selected={view === 'week'} className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Semaine</button>
        </div>
        <div className="date-controls">
          <button className="date-arrow" aria-label="Période précédente" onClick={() => shiftedSelectedDate(view === 'day' ? -1 : -7)}><Icon name="chevronLeft" size={17} /></button>
          <span className="date-range">{view === 'day' ? dayTitle(selectedDate) : `${dayTitle(dates[0], { day: 'numeric', month: 'short' })} — ${dayTitle(dates[6], { day: 'numeric', month: 'short', year: 'numeric' })}`}</span>
          <button className="date-arrow" aria-label="Période suivante" onClick={() => shiftedSelectedDate(view === 'day' ? 1 : 7)}><Icon name="chevronRight" size={17} /></button>
          <button className="today-button" onClick={() => setSelectedDate(today)}>Aujourd’hui</button>
        </div>
      </div>

      {view === 'day' ? (
        <section className="day-agenda-card" aria-label={`Agenda du ${dayTitle(selectedDate)}`}>
          <div className="agenda-card-head"><div><span className="section-label">JOURNÉE</span><h2>{dayTitle(selectedDate)}</h2></div><div className="day-head-actions"><button className="small-add-button" onClick={() => openNew()}><Icon name="plus" size={15} /> Ajouter</button></div></div>
          {visibleBlocks.length === 0 ? <div className="agenda-empty"><div className="empty-calendar-icon"><Icon name="calendar" size={22} /></div><div><strong>Aucun bloc prévu</strong><p>Crée un repère souple pour ta journée. Tu peux le déplacer à tout moment.</p></div><button onClick={() => openNew()}>Ajouter le premier bloc <Icon name="arrow" size={15} /></button></div> : (
            <div className="timeline-scroll">
              <div className="timeline-layout" style={{ '--timeline-h': `${TIMELINE_HEIGHT}px` } as CSSProperties}>
                <div className="time-rail">{hours.map((minute) => <div className="hour-label" key={minute} style={{ top: `${(minute - DAY_START_MINUTE) * MINUTE_HEIGHT}px` }}>{formatTime(minute)}</div>)}</div>
                <div className="timeline-track" onPointerMove={handlePointerMove} onPointerUp={finishDrag} onPointerCancel={cancelDrag}>
                  {hours.map((minute) => <div key={minute} className="hour-rule" style={{ top: `${(minute - DAY_START_MINUTE) * MINUTE_HEIGHT}px` }} />)}
                  {layoutTimeline(visibleBlocks.map((block) => dragPreview?.id === block.id ? { ...block, startMinute: dragPreview.startMinute } : block)).filter((block) => block.startMinute + block.durationMinutes > DAY_START_MINUTE && block.startMinute < DAY_END_MINUTE).map((block) => {
                    const visibleStart = Math.max(block.startMinute, DAY_START_MINUTE)
                    const visibleEnd = Math.min(block.startMinute + block.durationMinutes, DAY_END_MINUTE)
                    const style: CSSProperties = {
                      top: `${(visibleStart - DAY_START_MINUTE) * MINUTE_HEIGHT}px`,
                      height: `${Math.max((visibleEnd - visibleStart) * MINUTE_HEIGHT, 39)}px`,
                      left: `calc(${(block.lane / block.laneCount) * 100}% + 4px)`,
                      width: `calc(${100 / block.laneCount}% - 8px)`,
                    }
                    return <div key={block.id} className={`timeline-block activity-${slug(block.activity)} ${block.durationMinutes < 45 ? 'block-compact' : ''} ${dragPreview?.id === block.id ? 'drag-preview' : ''}`} style={style} onPointerDown={(event) => handlePointerDown(block, event)} onClick={(event) => { if ((event.target as HTMLElement).closest('button')) return; if (didDragRef.current) { didDragRef.current = false; return } setEditing(block) }} title="Fais glisser pour déplacer de 15 minutes; clique pour modifier" aria-label={`${block.title}, ${formatTime(block.startMinute)}, ${block.durationMinutes} minutes`}>
                      <div className="block-main"><span className="block-time">{formatTime(block.startMinute)} — {formatTime(block.startMinute + block.durationMinutes)}</span><strong>{block.title}</strong><span className="block-activity">{block.activity}{block.repeatDays.length > 0 && <span className="repeat-marker"> · chaque semaine</span>}</span></div>
                      <div className="block-actions"><button aria-label={`Modifier ${block.title}`} onClick={() => setEditing(block)}><Icon name="edit" size={14} /></button><button aria-label={`Copier ${block.title}`} onClick={() => setCopiedBlock(block)}><Icon name="copy" size={14} /></button><button aria-label={`Dupliquer ${block.title}`} onClick={() => duplicateBlock(block)}><Icon name="duplicate" size={14} /></button></div>
                    </div>
                  })}
                  <div className="timeline-end">24:00</div>
                </div>
              </div>
            </div>
          )}
          <div className="timeline-hint"><span className="hint-grip" aria-hidden="true" /> Fais glisser un bloc pour le décaler par pas de 15 min. Clique sur les icônes pour le modifier, copier ou dupliquer.</div>
        </section>
      ) : (
        <section className="week-agenda-card" aria-label="Vue hebdomadaire">
          <div className="week-grid-scroll"><div className="week-grid">
            {dates.map((key) => {
              const dayBlocks = getBlocksForDate(data.blocks, key)
              const date = fromDateKey(key)
              const selected = key === selectedDate
              return <div key={key} className={`week-day-column ${selected ? 'selected' : ''} ${key === today ? 'is-today' : ''}`}>
                <button className="week-day-heading" onClick={() => { setSelectedDate(key); setView('day') }}><span>{new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date).replace('.', '')}</span><strong>{date.getDate()}</strong><small>{dayBlocks.length ? 'Planifiée' : 'Libre'}</small></button>
                <div className="week-day-blocks">{dayBlocks.map((block) => <button key={block.id} className={`week-block activity-${slug(block.activity)}`} onClick={() => { setSelectedDate(key); setEditing(block) }}><time>{formatTime(block.startMinute)}</time><strong>{block.title}</strong></button>)}</div>
                <button className="week-add" aria-label={`Ajouter un bloc le ${dayTitle(key)}`} onClick={() => openNew(key)}><Icon name="plus" size={15} /></button>
              </div>
            })}
          </div></div>
          <div className="week-footer"><span>Choisis une journée pour ouvrir sa timeline détaillée.</span><span>Les répétitions apparaissent sur les jours sélectionnés.</span></div>
        </section>
      )}

      <section className="template-bar">
        <div className="template-copy"><span className="section-label">TES MODÈLES</span><strong>Prépare une journée type</strong><small>Enregistre ou réutilise une organisation.</small></div>
        <div className="template-actions">
          <button className="outline-button" onClick={saveDayTemplate} disabled={visibleBlocks.length === 0}>Enregistrer cette journée</button>
          <select aria-label="Choisir un modèle de journée" value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value)}><option value="">Choisir un modèle</option>{data.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select>
          <button className="outline-button" onClick={applyTemplate} disabled={!selectedTemplate}>Appliquer</button>
        </div>
      </section>

      <section className="planner-clipboard"><span>{copiedBlock ? <>Copié : <strong>{copiedBlock.title}</strong></> : 'Copie un bloc pour le coller sur une autre journée.'}</span><button onClick={pasteBlock} disabled={!copiedBlock}><Icon name="copy" size={14} /> Coller dans cette journée</button></section>

      {editing !== undefined && <BlockEditor key={editing?.id ?? `new-${selectedDate}`} block={editing} date={selectedDate} blocks={data.blocks} onClose={() => setEditing(undefined)} onSave={(block, id) => saveBlock(block, id)} onDelete={removeBlock} />}
    </div>
  )
}

function BlockEditor({ block, date, blocks, onClose, onSave, onDelete }: {
  block: ScheduleBlock | null
  date: string
  blocks: ScheduleBlock[]
  onClose: () => void
  onSave: (draft: BlockDraft, id?: string) => void
  onDelete: (id: string) => void
}) {
  const [title, setTitle] = useState(block?.title ?? '')
  const [activity, setActivity] = useState(block?.activity ?? 'Mathématiques')
  const [blockDate, setBlockDate] = useState(block?.date ?? date)
  const [time, setTime] = useState(formatTime(block?.startMinute ?? 9 * 60))
  const [duration, setDuration] = useState(block?.durationMinutes ?? 60)
  const [repeatDays, setRepeatDays] = useState<number[]>(block?.repeatDays ?? [])
  const [error, setError] = useState('')
  const timeMinute = parseTime(time)
  const conflicts = timeMinute === undefined ? [] : getConflicts(blocks, { id: block?.id ?? 'draft', date: blockDate, startMinute: timeMinute, durationMinutes: duration })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) { setError('Donne un titre à ce bloc.'); return }
    if (timeMinute === undefined) { setError('Choisis une heure valide.'); return }
    if (timeMinute < DAY_START_MINUTE) { setError(`L’agenda commence à ${formatTime(DAY_START_MINUTE)} : choisis une heure à partir de là.`); return }
    if (!Number.isInteger(duration) || duration < 15 || duration > 720) { setError('La durée doit être comprise entre 15 min et 12 h.'); return }
    if (timeMinute + duration > DAY_END_MINUTE) { setError('Ce bloc dépasserait minuit. Réduis sa durée ou avance son heure de début.'); return }
    onSave({ title: cleanTitle, activity, date: blockDate, startMinute: timeMinute, durationMinutes: duration, repeatDays }, block?.id)
  }

  const toggleDay = (day: number) => setRepeatDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="block-editor" role="dialog" aria-modal="true" aria-labelledby="block-editor-title">
      <div className="editor-head"><div><span className="section-label">{block ? 'MODIFIER LE BLOC' : 'NOUVEAU REPÈRE'}</span><h2 id="block-editor-title">{block ? 'Ajuste ta journée.' : 'Planifie un moment.'}</h2></div><button className="editor-close" aria-label="Fermer" onClick={onClose}><Icon name="close" size={19} /></button></div>
      <form onSubmit={handleSubmit}>
        <label className="form-label">Nom du bloc<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Mathématiques" maxLength={120} /></label>
        <div className="form-grid">
          <label className="form-label">Activité<input list="activity-options" value={activity} onChange={(event) => setActivity(event.target.value)} maxLength={50} /><datalist id="activity-options">{activities.map((item) => <option key={item} value={item} />)}</datalist></label>
          <label className="form-label">Jour<input type="date" value={blockDate} onChange={(event) => setBlockDate(event.target.value)} required /></label>
          <label className="form-label">Début<input type="time" step="900" value={time} onChange={(event) => setTime(event.target.value)} required /></label>
          <label className="form-label">Durée · minutes<input type="number" min={15} max={720} step={15} value={duration} onChange={(event) => setDuration(Number(event.target.value))} required /></label>
        </div>
        <fieldset className="repeat-fieldset"><legend>Répéter chaque semaine <span>(facultatif)</span></legend><div className="weekday-picker">{weekdayChoices.map((day) => <button key={day} type="button" className={repeatDays.includes(day) ? 'selected' : ''} aria-pressed={repeatDays.includes(day)} aria-label={`Répéter le ${dayTitle(addDays(blockDate, (day - weekdayForDate(blockDate) + 7) % 7), { weekday: 'long' })}`} onClick={() => toggleDay(day)}>{dayInitials[day]}</button>)}</div>{repeatDays.length > 0 && <small>Cette série commence à la date choisie. La modification s’applique à toutes ses semaines.</small>}</fieldset>
        {conflicts.length > 0 && <div className="conflict-note" role="status"><span>!</span><div><strong>Ce créneau chevauche {conflicts.length} bloc{conflicts.length > 1 ? 's' : ''}.</strong><small>Tu peux quand même l’enregistrer; aucun bloc ne sera déplacé automatiquement.</small></div></div>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="editor-footer">{block && <button className="delete-button" type="button" onClick={() => onDelete(block.id)}><Icon name="trash" size={15} /> Supprimer</button>}<button className="editor-cancel" type="button" onClick={onClose}>Annuler</button><button className="editor-save" type="submit">{block ? 'Enregistrer' : 'Créer le bloc'} <Icon name="arrow" size={15} /></button></div>
      </form>
    </section>
  </div>
}

function slug(value: string) {
  return value.toLocaleLowerCase('fr').replace(/[^a-z0-9]+/g, '-')
}
