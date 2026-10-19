import { useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { ExpeditionScene } from '../camp/ExpeditionScene'
import { formatHours, mountains, type MountainEntry } from '../../data/mountain'
import { formatDuration, type SessionData, type SessionRecord } from '../sessions/model'
import { formatFocusTime, getActivityTotals, getExpeditionMetrics } from '../sessions/progression'

function formatSessionDate(timestamp: number) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp))
}

function ActivityBar({ activity, seconds, maxSeconds }: { activity: string; seconds: number; maxSeconds: number }) {
  const width = maxSeconds > 0 ? Math.max(3, (seconds / maxSeconds) * 100) : 0
  return <li className="activity-total-row"><div className="activity-total-heading"><strong>{activity}</strong><span>{formatFocusTime(seconds)}</span></div><div className="activity-total-track"><i style={{ width: `${width}%` }} /></div></li>
}

function SessionHistoryRow({ session }: { session: SessionRecord }) {
  return <li className={`history-session-row ${session.outcome === 'abandoned' ? 'interrupted' : ''}`}><span className="history-session-icon"><Icon name={session.outcome === 'abandoned' ? 'close' : 'check'} size={15} /></span><div className="history-session-main"><strong>{session.activity}</strong><span>{session.skill} · {session.outcome === 'abandoned' ? 'interrompue' : formatSessionDate(session.startedAt)}</span></div><time>{formatDuration(session.actualDurationSeconds)}</time></li>
}

export function ProgressionView({ data, mountain }: { data: SessionData; mountain: MountainEntry }) {
  const [query, setQuery] = useState('')
  const metrics = getExpeditionMetrics(data.history, mountain)
  const mountainHistory = data.history.filter((session) => session.mountainId === mountain.id)
  const activities = getActivityTotals(mountainHistory)
  const latestSessions = [...mountainHistory].sort((a, b) => b.startedAt - a.startedAt).slice(0, 30)
  const maxSeconds = activities[0]?.seconds ?? 0
  const remainingAltitude = Math.max(0, metrics.summitAltitude - metrics.currentAltitude)
  const isSummitReached = metrics.summitsReached > 0
  const filteredMountains = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr')
    return normalized ? mountains.filter((item) => `${item.name} ${item.country}`.toLocaleLowerCase('fr').includes(normalized)) : mountains
  }, [query])

  return <div className="page-content progression-page">
    <div className="page-heading planner-heading"><div><div className="eyebrow"><span className="eyebrow-line" />CARNET D’ASCENSION</div><h1>Progression</h1></div></div>

    <section className="mountain-picker-panel"><div className="mountain-picker-heading"><div><span className="section-label">ORDRE DES EXPÉDITIONS</span><h2>Les 100 montagnes</h2></div><label className="mountain-search"><Icon name="search" size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom ou pays…" aria-label="Rechercher une montagne"/></label></div>
      <div className="mountain-picker-list" role="list" aria-label="Catalogue des montagnes, dans l’ordre des expéditions">
        {filteredMountains.map((item) => {
          const status = item.order < mountain.order || (item.id === mountain.id && isSummitReached) ? 'done' : item.id === mountain.id ? 'current' : 'locked'
          return <div key={item.id} role="listitem" aria-current={status === 'current' ? 'step' : undefined} className={`mountain-choice is-${status} ${status === 'current' ? 'selected' : ''}`}><span className="mountain-choice-order">{String(item.order).padStart(2, '0')}</span><span className="mountain-choice-main"><strong>{item.name}</strong><small>{item.country}{item.entryType === 'route' ? ' · Voie' : ''}</small></span><span className="mountain-choice-altitude">{item.altitudeLabel ?? '—'}<small>{formatHours(item.virtualDurationMinutes)}</small></span><span className="mountain-choice-status">{status === 'done' ? <><Icon name="check" size={14}/>Sommet</> : status === 'current' ? 'En cours' : 'À venir'}</span></div>
        })}
        {filteredMountains.length === 0 && <p className="mountain-search-empty">Aucun résultat pour « {query} ».</p>}
      </div>
    </section>

    <div className="progression-metrics">
      <section><span>TEMPS DE TRAVAIL</span><strong>{formatFocusTime(metrics.totalFocusSeconds)}</strong><small>sur cette expédition</small></section>
      <section><span>ALTITUDE VIRTUELLE</span><strong>{metrics.currentAltitude.toLocaleString('fr-FR')} m</strong><small>{`sur ${mountain.altitudeLabel ?? `${metrics.summitAltitude.toLocaleString('fr-FR')} m`}`}</small></section>
      <section><span>SOMMETS ATTEINTS</span><strong>{String(metrics.summitsReached).padStart(2, '0')}</strong><small>{isSummitReached ? mountain.name : 'ascension en cours'}</small></section>
    </div>

    <section className={`expedition-progress-card env-${mountain.environment}`}>
      <div className="expedition-progress-art expedition-progress-scene"><ExpeditionScene mountain={mountain} progress={metrics.progressPercent / 100} state="idle" /></div>
      <div className="expedition-progress-copy"><div className="section-label">{mountain.country.toUpperCase()}</div><h2>{mountain.name}</h2><p>{isSummitReached ? 'Sommet atteint. Le temps de session reste inscrit dans ton carnet.' : 'Le temps de session fait avancer cette ascension virtuelle.'}</p><div className="expedition-progress-track"><i style={{ width: `${metrics.progressPercent}%` }}/></div><div className="expedition-altitudes"><span>{mountain.baseName ?? 'Départ'}</span><strong>{metrics.currentAltitude.toLocaleString('fr-FR')} m</strong><span>{mountain.altitudeLabel ?? 'Sommet'}</span></div><div className="expedition-rule"><Icon name="spark" size={15}/><span>Échelle de jeu : 1 m toutes les 5 secondes · {formatHours(mountain.virtualDurationMinutes)} de travail pour ce sommet · {remainingAltitude.toLocaleString('fr-FR')} m restants.</span></div>{mountain.sourceUrl && <a className="expedition-source" href={mountain.sourceUrl} target="_blank" rel="noreferrer">Source officielle · Kosciuszko Walk <Icon name="arrow" size={14}/></a>}</div>
    </section>

    <div className="progression-columns">
      <section className="progression-panel"><div className="progression-panel-head"><div><span className="section-label">RÉPARTITION</span><h2>Temps par activité</h2></div></div>
        {activities.length === 0 ? <p className="progression-empty">Les activités apparaîtront après une session sur cette montagne.</p> : <ul className="activity-total-list">{activities.map((item) => <ActivityBar key={item.activity} activity={item.activity} seconds={item.seconds} maxSeconds={maxSeconds}/>)}</ul>}
      </section>
      <section className="progression-panel history-panel"><div className="progression-panel-head"><div><span className="section-label">HISTORIQUE</span><h2>Sessions</h2></div></div>
        {latestSessions.length === 0 ? <p className="progression-empty">Les sessions terminées sur cette montagne apparaîtront ici.</p> : <ul className="history-session-list">{latestSessions.map((session) => <SessionHistoryRow key={session.id} session={session}/>)}</ul>}
      </section>
    </div>
  </div>
}
