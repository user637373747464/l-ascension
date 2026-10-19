import { useMemo, type CSSProperties, type ReactNode } from 'react'
import type { MountainEntry } from '../../data/mountain'
import { PixelIcon } from '../../components/PixelIcon'
import { Chara, type CharaAnimation } from '../chara/Chara'
import { clamp, rand } from './noise'
import { mountainSeed } from './landscape'
import { renderRunArt, RUN } from './runArt'
import { getParticleLayers, type ParticleLayer } from './particles'
import type { Strip } from './artKit'
import { SummitView } from './SummitView'

export type ClimbState = 'idle' | 'climbing' | 'paused'

/** One strip of landscape: a picture repeated sideways that slides by exactly one tile per turn, whole art pixels at a time. */
export function ScrollStrip({ strip, className = '', delay = 0 }: { strip: Strip; className?: string; delay?: number }) {
  const style = { '--w': strip.w, '--h': strip.h, '--bottom': strip.bottom, '--secs': `${strip.seconds}s`, '--delay': `${delay}s`, backgroundImage: `url(${strip.src})`, opacity: strip.opacity } as CSSProperties
  return <div className={`run-strip ${strip.seconds === 0 ? 'is-still' : ''} ${className}`} style={style} aria-hidden="true" />
}

/** The way up, from the tent to the summit: it fills as the altitude grows. */
export function Gauge({ progress }: { progress: number }) {
  const clamped = clamp(progress, 0, 1)
  return <div className="exp-gauge" role="progressbar" aria-label="Progression vers le sommet" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped * 100)}>
    <span className="exp-gauge-end"><PixelIcon name="tent" pixel={2} /></span>
    <span className="exp-gauge-track"><i style={{ width: `${clamped * 100}%` }} /></span>
    <span className="exp-gauge-end"><PixelIcon name="summit" pixel={2} /></span>
  </div>
}

/** A layer of snow, rain, dust or ash: all its grains are box-shadows of one small square that slides across and loops. */
function Particles({ layer }: { layer: ParticleLayer }) {
  const style = { '--w': layer.w, '--p': layer.p, '--secs': `${layer.seconds}s`, '--dir': layer.dir } as CSSProperties
  const dot = { '--sw': layer.size[0], '--sh': layer.size[1], boxShadow: layer.shadows } as CSSProperties
  return <div className={`part-layer ${layer.gust ? 'is-gust' : ''}`} style={style} aria-hidden="true"><div className="part-x"><div className="part-y"><i className="part-dot" style={dot} /></div></div></div>
}

function Walker({ pose, breath, print }: { pose: CharaAnimation; breath: boolean; print: string }) {
  return <>
    <div className="run-prints" style={{ '--print': print } as CSSProperties} aria-hidden="true"><i /><i /><i /><i /><i /></div>
    <div className="run-walker">
      <div className="run-lean"><Chara animation={pose} facing={1} /></div>
      {breath && <span className="run-breath" aria-hidden="true"><i /><i /><i /></span>}
      <span className="run-gale" aria-hidden="true"><i /><i /><i /></span>
    </div>
  </>
}

function RunView({ mountain, state }: { mountain: MountainEntry; state: ClimbState }) {
  const art = useMemo(() => renderRunArt(mountain), [mountain])
  const seed = mountainSeed(mountain)
  const layers = useMemo(() => getParticleLayers(art.landscape, art.weather, seed), [art, seed])
  const bolt = useMemo(() => {
    // a jagged lightning bolt, one box-shadow per pixel
    const x0 = 24 + Math.floor(rand(seed, 77) * 70)
    const pixels: string[] = []
    let x = x0
    for (let y = 0; y < 62; y += 1) {
      x += y % 7 === 0 ? (rand(seed, y, 5) > 0.5 ? 2 : -2) : 0
      pixels.push(`calc(var(--px) * ${x}) calc(var(--px) * ${y}) 0 0 #fff4c2`, `calc(var(--px) * ${x + 1}) calc(var(--px) * ${y}) 0 0 #b9d4ff`)
    }
    return pixels.join(',')
  }, [seed])
  const pose: CharaAnimation = state === 'climbing' ? 'walk' : state === 'paused' ? 'tired' : 'rest'
  const [clouds, ...rest] = art.behind
  return <>
    <img className="run-sky" src={art.sky} alt="" draggable={false} />
    <div className="run-stage">
      <ScrollStrip strip={clouds} />
      {/* more clouds in the extra sky above the picture, only visible when the scene fills a tall screen */}
      {[0, 1, 2].map((index) => <ScrollStrip key={`high-${index}`} className="run-extra" strip={{ ...clouds, key: `high-${index}`, bottom: clouds.bottom + 50 * (index + 1), opacity: 0.9 - index * 0.2 }} delay={-(index + 1) * 6.5} />)}
      {art.weather.lightning && <i className="run-bolt" style={{ boxShadow: bolt }} aria-hidden="true" />}
      {art.weather.glow && <i className="run-glow" style={{ background: art.weather.glow }} aria-hidden="true" />}
      {rest.map((strip) => <ScrollStrip key={strip.key} strip={strip} />)}
      <Walker pose={pose} breath={art.weather.breath} print={art.print} />
      {art.front.map((strip) => <ScrollStrip key={strip.key} strip={strip} />)}
      {layers.map((layer) => <Particles key={layer.key} layer={layer} />)}
      {art.veils.map((strip) => <ScrollStrip key={strip.key} strip={strip} />)}
    </div>
    <i className="run-storm" style={{ background: art.weather.storm }} aria-hidden="true" />
    {art.weather.lightning && <i className="run-flash" aria-hidden="true" />}
  </>
}

/**
 * The walk of the current expedition, in pixel art: the explorer trudges through the storm while the landscape of the
 * mountain (one of five, chosen from its altitude and continent) slides past, in a loop of 20 seconds.
 * The summit is only shown once it is reached: then the storm clears on a sea of clouds.
 * `progress` is the real position on the route (0 to 1).
 */
export function ExpeditionScene({ mountain, progress, state = 'idle', gauge = true, fill = false, children }: { mountain: MountainEntry; progress: number; state?: ClimbState; gauge?: boolean; fill?: boolean; children?: ReactNode }) {
  const clamped = clamp(progress, 0, 1)
  const percent = Math.round(clamped * 100)
  const summit = clamped >= 1
  const label = summit ? `${mountain.name} : sommet atteint` : `${mountain.name} : ${percent} % de l’itinéraire parcouru`
  // the summit keeps moving even when the scene is shown as a picture: it is the reward
  const shown = summit && state === 'idle' ? 'climbing' : state
  return <div className={`expedition-scene ${summit ? 'is-summit' : 'is-run'} ${fill ? 'is-fill' : ''} state-${shown}`} role="group" aria-label={label} style={{ '--loop': `${RUN.loop}s` } as CSSProperties}>
    {summit ? <SummitView mountain={mountain} state={state} /> : <RunView mountain={mountain} state={state} />}
    {gauge && <Gauge progress={clamped} />}
    {children}
  </div>
}
