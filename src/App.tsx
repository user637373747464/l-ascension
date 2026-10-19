import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from './components/Icon'
import { PixelIcon } from './components/PixelIcon'
import { PixelLogo } from './components/PixelLogo'
import { formatHours, getMountainWeather, mountains } from './data/mountain'
import { AgendaView } from './features/agenda/AgendaView'
import { TasksView } from './features/tasks/TasksView'
import { ProgressionView } from './features/progression/ProgressionView'
import { dateKey, formatTime, getBlocksForDate, loadPlannerData, savePlannerData, type PlannerData } from './features/planner/model'
import { formatCountdown, getSessionElapsedSeconds, getSessionRemainingSeconds, isSessionPaused, loadSessionData, reconcileSessionData, saveSessionData, type SessionData } from './features/sessions/model'
import { getCurrentExpedition, getExpeditionMetrics, getLiveAltitude, getRouteProgress } from './features/sessions/progression'
import { SessionDialog } from './features/sessions/SessionDialog'
import { ProfileView } from './features/profile/ProfileView'
import { TentScene } from './features/camp/TentScene'
import { CHARA_PORTRAIT } from './features/chara/Chara'

type Section = 'Camp' | 'Agenda' | 'Tâches' | 'Progression' | 'Profil'

const navigation: { label: Section; icon: 'camp' | 'calendar' | 'check' | 'mountain' | 'user' }[] = [
  { label: 'Camp', icon: 'camp' },
  { label: 'Agenda', icon: 'calendar' },
  { label: 'Tâches', icon: 'check' },
  { label: 'Progression', icon: 'mountain' },
  { label: 'Profil', icon: 'user' },
]

function formatDate() {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
}

function App() {
  const [section, setSection] = useState<Section>('Camp')
  const [initialPlannerLoad] = useState(() => loadPlannerData())
  const [plannerData, setPlannerData] = useState<PlannerData>(initialPlannerLoad.data)
  const [storageMessage, setStorageMessage] = useState(initialPlannerLoad.warning ?? '')
  const [initialSessionLoad] = useState(() => {
    const loaded = loadSessionData()
    const data = reconcileSessionData(loaded.data)
    if (data !== loaded.data) saveSessionData(data)
    return { ...loaded, data }
  })
  const [sessionData, setSessionData] = useState<SessionData>(initialSessionLoad.data)
  const [sessionStorageMessage, setSessionStorageMessage] = useState(initialSessionLoad.warning ?? '')
  const [sessionOpen, setSessionOpen] = useState(Boolean(initialSessionLoad.data.active || initialSessionLoad.data.pendingSummaryId))
  const [sessionNow, setSessionNow] = useState(Date.now())
  // Expeditions follow the catalogue order: the current mountain is the first one whose summit is not reached yet.
  const selectedMountain = useMemo(() => getCurrentExpedition(sessionData.history, mountains), [sessionData.history])
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return localStorage.getItem('ascension.theme.v1') === 'dark' ? 'dark' : 'light' } catch { return 'light' }
  })
  const weather = getMountainWeather(selectedMountain)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('ascension.theme.v1', theme) } catch { /* theme remains available for this visit */ }
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', theme === 'dark' ? '#111b2a' : '#f3f7fa')
  }, [theme])

  const updatePlannerData = (next: PlannerData) => {
    setPlannerData(next)
    setStorageMessage(savePlannerData(next) ? '' : 'La sauvegarde locale est indisponible. Vérifie les réglages de stockage de Safari.')
  }

  const updateSessionData = useCallback((next: SessionData) => {
    setSessionData(next)
    setSessionStorageMessage(saveSessionData(next) ? '' : 'La sauvegarde de session locale est indisponible. Vérifie les réglages de stockage de Safari.')
  }, [])

  useEffect(() => {
    if (!sessionData.active) return
    const reconcile = () => {
      const now = Date.now()
      setSessionNow(now)
      setSessionData((current) => {
        const next = reconcileSessionData(current, now)
        if (next === current) return current
        setSessionStorageMessage(saveSessionData(next) ? '' : 'La sauvegarde de session locale est indisponible. Vérifie les réglages de stockage de Safari.')
        return next
      })
    }
    const interval = window.setInterval(reconcile, 1000)
    window.addEventListener('focus', reconcile)
    document.addEventListener('visibilitychange', reconcile)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', reconcile)
      document.removeEventListener('visibilitychange', reconcile)
    }
  }, [sessionData.active?.id, sessionData.active?.endsAt])

  useEffect(() => {
    if (sessionData.pendingSummaryId) setSessionOpen(true)
  }, [sessionData.pendingSummaryId])

  // A running session cannot be left: the browser asks for a confirmation before the tab is closed or reloaded.
  const sessionRunning = Boolean(sessionData.active)
  useEffect(() => {
    if (!sessionRunning) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [sessionRunning])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [section])

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navigation principale">
        <button className="brand" onClick={() => setSection('Camp')} aria-label="Retour au camp de base">
          <span className="brand-mark"><PixelLogo pixel={2} /></span>
          <span className="brand-copy"><strong>ASCENSION</strong></span>
        </button>
        <div className="nav-caption">EXPÉDITION</div>
        <nav className="side-nav">
          {navigation.map((item) => (
            <button key={item.label} className={`nav-link ${section === item.label ? 'active' : ''}`} onClick={() => setSection(item.label)}>
              <Icon name={item.icon} size={19} /><span>{item.label}</span>
              {item.label === 'Camp' && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="weather-chip"><span className="weather-icon"><Icon name="spark" size={17} /></span><span><strong>{weather.label}</strong><small>{weather.temperature}° · météo illustrative</small></span></div>
          <button className="profile-mini" onClick={() => setSection('Profil')}>
            <span className="avatar-small has-portrait"><img src={CHARA_PORTRAIT} alt="" /></span><span><strong>Mon profil</strong><small>Village sherpa</small></span><Icon name="arrow" size={16} />
          </button>
          <div className="sidebar-footnote"><span className="status-dot" />Tout reste sur cet appareil</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><PixelLogo pixel={1} /></span><strong>ASCENSION</strong></div>
          <div className="breadcrumbs"><span>EXPÉDITION</span><b>/</b><strong>{section.toUpperCase()}</strong></div>
          <div className="topbar-right"><span className="today-date">{formatDate()}</span><button className="icon-button" aria-label={theme === 'light' ? 'Activer le thème sombre' : 'Activer le thème clair'} title={theme === 'light' ? 'Thème sombre' : 'Thème clair'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}><Icon name={theme === 'light' ? 'moon' : 'sun'} size={19} /></button></div>
        </header>

        {(storageMessage || sessionStorageMessage) && <div className="storage-banner" role="status"><Icon name="alert" size={16} />{storageMessage || sessionStorageMessage}</div>}
        {sessionData.active && !sessionOpen && <div className="active-session-banner"><span><i /> {isSessionPaused(sessionData.active) ? 'SESSION EN PAUSE' : 'ASCENSION EN COURS'}</span><strong>{sessionData.active.activity}</strong><time>{formatCountdown(getSessionRemainingSeconds(sessionData.active, sessionNow))}</time><button onClick={() => setSessionOpen(true)}>Reprendre <Icon name="arrow" size={14} /></button></div>}
        {section === 'Camp' ? <CampHome data={plannerData} sessions={sessionData} mountain={selectedMountain} now={sessionNow} onNavigate={setSection} onStart={() => setSessionOpen(true)} /> : section === 'Agenda' ? <AgendaView data={plannerData} onChange={updatePlannerData} /> : section === 'Tâches' ? <TasksView data={plannerData} onChange={updatePlannerData} /> : section === 'Progression' ? <ProgressionView data={sessionData} mountain={selectedMountain} /> : <ProfileView data={sessionData} />}
      </main>

      <nav className="mobile-nav" aria-label="Navigation principale">
        {navigation.map((item) => <button key={item.label} className={section === item.label ? 'active' : ''} onClick={() => setSection(item.label)} aria-current={section === item.label ? 'page' : undefined}><Icon name={item.icon} size={20} /><span>{item.label}</span></button>)}
      </nav>

      {sessionOpen && <SessionDialog data={sessionData} mountain={selectedMountain} onChange={updateSessionData} onClose={() => setSessionOpen(false)} />}
    </div>
  )
}

function CampHome({ data, sessions, mountain, now, onNavigate, onStart }: { data: PlannerData; sessions: SessionData; mountain: (typeof mountains)[number]; now: number; onNavigate: (section: Section) => void; onStart: () => void }) {
  const todayBlocks = getBlocksForDate(data.blocks, dateKey(new Date()))
  const metrics = getExpeditionMetrics(sessions.history, mountain)
  const active = sessions.active
  const elapsed = active ? getSessionElapsedSeconds(active, now) : 0
  const progress = getRouteProgress(metrics, elapsed, active?.gearBonuses?.ascentPercent ?? 0)
  const altitude = getLiveAltitude(metrics, elapsed, active?.gearBonuses?.ascentPercent ?? 0)
  const percent = Math.round(progress * 100)
  const totalSeconds = sessions.history.reduce((sum, session) => sum + session.actualDurationSeconds, 0)
  const totalMinutes = Math.floor(totalSeconds / 60)
  const summitsDone = mountain.order - 1 + (metrics.summitsReached ? 1 : 0)
  return (
    <div className="page-content camp-page">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" />CAMP DE BASE <span className="eyebrow-date">· {formatDate()}</span></div><h1>Camp de base</h1></div>
        <button className="quiet-link" onClick={() => onNavigate('Progression')}>Les 100 montagnes <Icon name="arrow" size={16} /></button>
      </div>

      <TentScene mountain={mountain} percent={percent} onStart={onStart} buttonLabel={active ? 'Reprendre la séance' : 'Lancer l’ascension'} />

      <div className="camp-grid">
        <section className="camp-info">
          <div className="camp-kicker">EN COURS · {String(mountain.order).padStart(2, '0')} / 100</div>
          <h2>{mountain.name}</h2>
          <p className="camp-place">{mountain.country}{mountain.routeName ? ` · ${mountain.routeName}` : ''}</p>
          <div className="camp-altitude"><strong>{altitude.toLocaleString('fr-FR')} m</strong><span>{mountain.altitudeLabel ? `sommet · ${mountain.altitudeLabel}` : `sommet · ${metrics.summitAltitude.toLocaleString('fr-FR')} m`}</span></div>
          <div className="route-meter" role="progressbar" aria-label="Progression sur l’itinéraire" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{ width: `${progress * 100}%` }} /></div>
          <div className="route-ends"><span>{mountain.baseName ?? 'Camp de départ'}</span><span>{percent} %</span></div>
          <ul className="camp-figures">
            <li><b>{String(Math.floor(totalMinutes / 60)).padStart(2, '0')} h {String(totalMinutes % 60).padStart(2, '0')}</b><span>de travail effectif</span></li>
            <li><b>{summitsDone}</b><span>{summitsDone > 1 ? 'sommets atteints' : 'sommet atteint'}</span></li>
            <li><b>{formatHours(mountain.virtualDurationMinutes)}</b><span>pour ce sommet</span></li>
          </ul>
        </section>

        <section className="day-card">
          <div className="card-topline"><div><span className="section-label">AUJOURD’HUI</span><h3>Ta journée en montagne</h3></div><span className="date-stamp">{new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date()).replace('.', '').toUpperCase()}</span></div>
          {todayBlocks.length === 0 ? <div className="day-empty"><PixelIcon name="tent" pixel={5} /><strong>Rien de prévu aujourd’hui</strong><p>Ajoute un bloc dans l’agenda quand tu en as besoin.</p><button className="outline-button" onClick={() => onNavigate('Agenda')}>Ouvrir l’agenda <Icon name="arrow" size={15} /></button></div> : <div className="day-schedule-preview"><ul>{todayBlocks.slice(0, 4).map((block) => <li key={block.id}><time>{formatTime(block.startMinute)}</time><span><strong>{block.title}</strong><small>{block.activity} · {block.durationMinutes} min</small></span></li>)}</ul><button className="outline-button" onClick={() => onNavigate('Agenda')}>Voir toute la journée <Icon name="arrow" size={15} /></button></div>}
        </section>
      </div>
    </div>
  )
}

export default App
