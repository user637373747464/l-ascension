import { useMemo, type CSSProperties } from 'react'
import { SECONDS_PER_METER, type MountainEntry } from '../../data/mountain'
import { Chara } from '../chara/Chara'
import { ScrollStrip } from './ExpeditionScene'
import { renderSummitArt, SUMMIT, type SummitImage } from './summitArt'

function Layer({ image, className = '' }: { image: SummitImage; className?: string }) {
  const style = { '--x': image.x, '--y': image.y, '--w': image.w, '--h': image.h } as CSSProperties
  return <img className={`summit-img ${className}`} src={image.src} alt="" draggable={false} style={style} />
}

const BIRD_UP = 'calc(var(--px) * 2) 0 0 0 #2b2347, calc(var(--px) * 4) 0 0 0 #2b2347, calc(var(--px) * 3) var(--px) 0 0 #2b2347'
const BIRD_DOWN = 'calc(var(--px) * 3) 0 0 0 #2b2347, calc(var(--px) * 2) var(--px) 0 0 #2b2347, calc(var(--px) * 4) var(--px) 0 0 #2b2347'

/**
 * The summit, once reached: the picture rises out of the fog above a sea of clouds at sunrise, then the title appears.
 * Everything that is not part of the arrival keeps moving gently (clouds, flag, bird, breath, the explorer cheering).
 */
export function SummitView({ mountain }: { mountain: MountainEntry; state?: string }) {
  const art = useMemo(() => renderSummitArt(mountain), [mountain])
  const meters = mountain.altitude ?? Math.round((mountain.virtualDurationMinutes * 60) / SECONDS_PER_METER)
  const altitude = `${meters.toLocaleString('fr-FR')} m`
  return <>
    <img className="run-sky" src={art.sky} alt="" draggable={false} />
    <div className="run-stage">
      {art.stars.map((star, index) => <i key={index} className="summit-twinkle" style={{ left: `calc(var(--px) * ${star.x})`, top: `calc(var(--px) * ${star.y})`, animationDelay: `${-index * 0.9}s` }} aria-hidden="true" />)}
      <span className="summit-bird" aria-hidden="true"><i className="wing-up" style={{ boxShadow: BIRD_UP }} /><i className="wing-down" style={{ boxShadow: BIRD_DOWN }} /></span>
      <div className="summit-rise" style={{ '--rise': SUMMIT.rise } as CSSProperties} aria-hidden="true">
        <Layer image={art.sun} />
        {art.peaks.map((peak) => <Layer key={peak.key} image={peak} />)}
        {art.seaBack.map((strip) => <ScrollStrip key={strip.key} strip={strip} />)}
        <Layer image={art.rock} />
        <Layer image={art.flagA} className="flag-a" />
        <Layer image={art.flagB} className="flag-b" />
        <div className="summit-man" style={{ '--foot': SUMMIT.groundY, '--at': SUMMIT.manX } as CSSProperties}>
          <Chara animation="rest" />
          <span className="run-breath"><i /><i /><i /></span>
        </div>
        <ScrollStrip strip={art.seaFront} />
      </div>
      <div className="summit-title">
        <strong>SOMMET ATTEINT</strong>
        <span>{mountain.name}</span>
        <small>{altitude}</small>
      </div>
    </div>
    <i className="summit-fog" aria-hidden="true" />
  </>
}
