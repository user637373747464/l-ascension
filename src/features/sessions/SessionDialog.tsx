import { useEffect, useState, type FormEvent } from 'react'
import { Icon } from '../../components/Icon'
import { PixelIcon } from '../../components/PixelIcon'
import { PixelLogo } from '../../components/PixelLogo'
import { mountains, type MountainEntry } from '../../data/mountain'
import { activitySkills, getSkillProgress, skillForActivity } from '../../data/skills'
import {
  abandonActiveSession,
  completeActiveSession,
  dismissSessionSummary,
  formatCountdown,
  formatDuration,
  getSessionElapsedSeconds,
  getSessionRemainingSeconds,
  isSessionPaused,
  pauseSession,
  reconcileSessionData,
  resumeSession,
  startSession,
  type SessionData,
} from './model'
import { getCurrentExpedition, getExpeditionMetrics, getLiveAltitude, getRouteProgress, getSessionAltitudeGain } from './progression'
import { ExpeditionScene, Gauge } from '../camp/ExpeditionScene'
import { getEquippedBonuses, getExpeditionPebbles, loadProfile } from '../profile/gear'

const presets = [15, 25, 45, 60, 90, 120]

export function SessionDialog({ data, mountain, onChange, onClose }: { data: SessionData; mountain: MountainEntry; onChange: (next: SessionData) => void; onClose: () => void }) {
  const [activity, setActivity] = useState('Mathématiques')
  const [duration, setDuration] = useState(25)
  const [now, setNow] = useState(Date.now())
  const [confirmingQuit, setConfirmingQuit] = useState(false)
  const active = data.active
  const summary = data.pendingSummaryId ? data.history.find((item) => item.id === data.pendingSummaryId) : undefined
  const summaryMountain = summary ? mountains.find((item) => item.id === summary.mountainId) ?? mountain : mountain
  const altitudeGain = summary ? getSessionAltitudeGain(data.history, summary.id, summaryMountain) : 0
  const summaryXpDelta = summary ? getSkillProgress(summary.activity, data.history).xp - getSkillProgress(summary.activity, data.history.filter((item) => item.id !== summary.id)).xp : 0
  const activeMountain = active ? mountains.find((item) => item.id === active.mountainId) ?? mountain : mountain
  const elapsed = active ? getSessionElapsedSeconds(active, now) : 0
  const paused = active ? isSessionPaused(active) : false
  const remaining = active ? getSessionRemainingSeconds(active, now) : 0
  const activeBonuses = active?.gearBonuses ?? { ascentPercent: 0, skillXpPercent: 0, bonusPebbles: 0 }
  const sessionProgress = active ? Math.min(1, elapsed / (active.plannedDurationMinutes * 60)) : 0
  const activeMetrics = active ? getExpeditionMetrics(data.history, activeMountain) : null
  // Real position on the route: completed work plus the time worked in this session so far.
  const routeProgress = activeMetrics ? getRouteProgress(activeMetrics, elapsed, activeBonuses.ascentPercent) : 0
  const liveAltitude = activeMetrics ? getLiveAltitude(activeMetrics, elapsed, activeBonuses.ascentPercent) : 0
  const atSummit = routeProgress >= 1
  // Quitting loses the progress of this summit and a little XP: the minutes worked in this session, taken from the skill.
  const quitXpLoss = active ? Math.min(getSkillProgress(active.activity, data.history).xp, Math.floor(elapsed / 60)) : 0
  const summaryMetrics = summary ? getExpeditionMetrics(data.history, summaryMountain) : null
  const summitReachedNow = summary && summaryMetrics ? summaryMetrics.summitsReached > 0 && getExpeditionMetrics(data.history.filter((item) => item.id !== summary.id), summaryMountain).summitsReached === 0 : false
  const nextMountain = summitReachedNow ? getCurrentExpedition(data.history, mountains) : null
  const summaryPebbles = summary ? getExpeditionPebbles(summary) : 0

  useEffect(() => { setConfirmingQuit(false) }, [active?.id])

  useEffect(() => {
    const updateClock = () => {
      const current = Date.now()
      setNow(current)
      const reconciled = reconcileSessionData(data, current)
      if (reconciled !== data) onChange(reconciled)
    }
    const interval = window.setInterval(updateClock, 1000)
    window.addEventListener('focus', updateClock)
    document.addEventListener('visibilitychange', updateClock)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', updateClock)
      document.removeEventListener('visibilitychange', updateClock)
    }
  }, [data, onChange])

  const begin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activity.trim() || duration < 5 || duration > 480) return
    onChange(startSession(data, { activity, skill: skillForActivity(activity), durationMinutes: duration, mountainId: mountain.id, gearBonuses: getEquippedBonuses(loadProfile().equipped) }))
  }

  const closeSummary = () => {
    if (summary) onChange(dismissSessionSummary(data, summary.id))
    onClose()
  }

  const quit = () => {
    setConfirmingQuit(false)
    onChange(abandonActiveSession(data, Date.now(), quitXpLoss))
  }

  const finishAtSummit = () => onChange(completeActiveSession(data, Date.now()))

  const togglePause = () => {
    const current = Date.now()
    setNow(current)
    onChange(paused ? resumeSession(data, current) : pauseSession(data, current))
  }

  if (active) return <div className="run-screen" role="dialog" aria-modal="true" aria-labelledby="session-title">
    <div className="run-stage-area">
      <ExpeditionScene mountain={activeMountain} progress={routeProgress} state={paused ? 'paused' : 'climbing'} gauge={false} fill>
        <div className="hud-top">
          <span className={`hud-chip hud-timer ${paused ? 'is-paused' : ''}`} role="timer" aria-label={`Temps restant ${formatCountdown(remaining)}${paused ? ', en pause' : ''}`}><strong>{formatCountdown(remaining)}</strong></span>
          <span className="hud-chip"><PixelIcon name="summit" pixel={2} /><small>{liveAltitude.toLocaleString('fr-FR')} m</small></span>
        </div>
      </ExpeditionScene>
    </div>
    <div className="run-panel">
      <div className="run-panel-head">
        <span className="session-eyebrow"><i /> {paused ? 'SESSION EN PAUSE' : atSummit ? 'SOMMET ATTEINT' : 'ASCENSION EN COURS'}</span>
        <h2 id="session-title">{active.activity}</h2>
      </div>
      <div className="run-title"><strong>{activeMountain.name}</strong><span>{liveAltitude.toLocaleString('fr-FR')} / {(activeMetrics?.summitAltitude ?? 0).toLocaleString('fr-FR')} m</span></div>
      <Gauge progress={routeProgress} />
      <div className="run-state"><span>{paused ? 'Pause : le temps et la montée sont arrêtés.' : `${active.skill} · ${Math.round(sessionProgress * 100)} % de la séance`}</span><b>{active.plannedDurationMinutes} min</b></div>
      <div className="pixel-meter" role="progressbar" aria-label="Avancement de la séance" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(sessionProgress * 100)}><i style={{ width: `${sessionProgress * 100}%` }} /></div>
      <div className="run-actions">
        <button className="pixel-button" onClick={togglePause}><Icon name={paused ? 'play' : 'pause'} size={16} />{paused ? 'Reprendre' : 'Pause'}</button>
        {atSummit
          ? <button className="pixel-button is-good" onClick={finishAtSummit}><PixelIcon name="summit" pixel={2} />Valider le sommet</button>
          : <button className="pixel-button is-danger" onClick={() => setConfirmingQuit(true)}><Icon name="close" size={16} />Quitter</button>}
      </div>
      <p className="run-lock">{atSummit ? 'Tu peux aussi continuer à travailler : le temps en plus rapporte de l’XP et des galets.' : 'Quitter fait perdre ta progression pour ce sommet.'}</p>
    </div>
    {confirmingQuit && <div className="quit-backdrop" role="presentation">
      <section className="quit-dialog" role="alertdialog" aria-modal="true" aria-labelledby="quit-title" aria-describedby="quit-text">
        <span className="session-eyebrow quit-eyebrow"><i /> ATTENTION</span>
        <h3 id="quit-title">Quitter l’ascension ?</h3>
        <p id="quit-text">Ta progression pour ce sommet sera perdue : tu retournes au camp de base.</p>
        <ul className="quit-losses">
          <li><PixelIcon name="summit" pixel={2} /><span><b>{liveAltitude.toLocaleString('fr-FR')} m</b> gagnés sur {activeMountain.name} sont perdus</span></li>
          {quitXpLoss > 0 && <li><PixelIcon name="tent" pixel={2} /><span><b>−{quitXpLoss} XP</b> en {active.skill}</span></li>}
          <li><PixelIcon name="pebble" pixel={3} /><span>Aucun galet pour cette séance</span></li>
        </ul>
        <div className="quit-actions">
          <button className="pixel-button" autoFocus onClick={() => setConfirmingQuit(false)}>Continuer l’ascension</button>
          <button className="pixel-button is-danger" onClick={quit}>Quitter quand même</button>
        </div>
      </section>
    </div>}
  </div>

  return <div className="session-backdrop" role="presentation">
    <section className="session-dialog" role="dialog" aria-modal="true" aria-labelledby="session-title">
      <div className="session-dialog-top"><span className="session-mark"><PixelLogo pixel={1} /></span>{!active && <button className="session-close" aria-label="Fermer" onClick={summary ? closeSummary : onClose}><Icon name="close" size={17} /></button>}</div>

      {summary ? <div className="session-summary">
        <span className="session-eyebrow"><i /> CARNET MIS À JOUR</span>
        <h2 id="session-title">{summary.outcome === 'abandoned' ? 'Ascension interrompue' : summitReachedNow ? 'Sommet atteint' : 'Ascension terminée'}</h2>
        <p className="session-intro">{summary.outcome === 'abandoned' ? 'Retour au camp de départ. Le temps réel reste dans ton carnet.' : 'Session enregistrée. Ton ascension reprend depuis ce nouveau point de camp.'}</p>
        <div className="summary-scene"><ExpeditionScene mountain={summaryMountain} progress={summary.outcome === 'abandoned' ? 0 : (summaryMetrics?.progressPercent ?? 0) / 100} state="idle" /></div>
        <div className="summary-time">{formatDuration(summary.actualDurationSeconds)}</div>
        <ul className="summary-rewards" aria-label="Récompenses de la session">
          {summaryXpDelta !== 0 && <li>{summaryXpDelta > 0 ? '+' : '−'}{Math.abs(summaryXpDelta)} XP · {summary.skill}</li>}
          {summaryPebbles > 0 && <li><PixelIcon name="pebble" pixel={3} /> +{summaryPebbles} galets</li>}
          {altitudeGain > 0 && <li><PixelIcon name="summit" pixel={2} /> +{altitudeGain} m</li>}
        </ul>
        <div className="summary-note">{summary.activity} · {summaryMountain.name} · {summaryMountain.country}</div>
        {summitReachedNow && <p className="summit-banner">Sommet du {summaryMountain.name} atteint. {nextMountain && nextMountain.id !== summaryMountain.id ? `Prochaine expédition : ${nextMountain.name}.` : 'Toutes les expéditions sont terminées.'}</p>}
        <button className="session-primary" onClick={closeSummary}>Retour au camp <Icon name="arrow" size={16} /></button>
      </div> : <form className="session-prep" onSubmit={begin}>
        <span className="session-eyebrow"><i /> PRÉPARATION DE L’ASCENSION</span>
        <h2 id="session-title">Préparer une session</h2>
        <p className="session-intro">Choisis une activité et une durée. Le temps réel reste calculé en arrière-plan.</p>
        <label className="session-field"><span>ACTIVITÉ</span><select value={activity} onChange={(event) => setActivity(event.target.value)}>{activitySkills.map((item) => <option key={item.activity}>{item.activity}</option>)}</select></label>
        <label className="session-field"><span>COMPÉTENCE</span><input value={skillForActivity(activity)} readOnly aria-readonly="true" /></label>
        <div className="session-field duration-field"><span>DURÉE <small>5 à 480 min</small></span><div className="duration-input-wrap"><input type="number" min={5} max={480} step={5} value={duration} onChange={(event) => setDuration(Number(event.target.value))} aria-label="Durée de la session en minutes" /><span>min</span></div></div>
        <div className="duration-presets" aria-label="Durées suggérées">{presets.map((minutes) => <button key={minutes} type="button" className={duration === minutes ? 'active' : ''} onClick={() => setDuration(minutes)}>{minutes} min</button>)}</div>
        <div className="session-privacy-note"><Icon name="spark" size={15} /><span>Une session terminée valide l’altitude, l’XP et les galets. Si tu quittes en cours de route, tu perds ta progression pour ce sommet.</span></div>
        <button className="session-primary" disabled={duration < 5 || duration > 480} type="submit">Lancer l’ascension <Icon name="arrow" size={16} /></button>
      </form>}
    </section>
  </div>
}
