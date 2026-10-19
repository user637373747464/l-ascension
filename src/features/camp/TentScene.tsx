import { useMemo, type ReactNode } from 'react'
import { formatHours, type MountainEntry } from '../../data/mountain'
import { PixelIcon } from '../../components/PixelIcon'
import { Snowfall } from './Snow'
import { PANORAMA, renderPanorama } from './pixelArt'
import { rand } from './noise'
import { asset } from '../../assetUrl'

/** Pixel stars that blink, in panorama pixels (the panorama is 240 pixels wide). */
function twinkles(seed: number) {
  const make = (offset: number) => Array.from({ length: 9 }, (_, index) => {
    const x = 105 + Math.floor(rand(seed, index + offset, 5) * 100)
    const y = 6 + Math.floor(rand(seed, index + offset, 6) * 58)
    return `calc(var(--px) * ${x}) calc(var(--px) * ${y}) 0 0 #fff6cf`
  }).join(',')
  return [make(0), make(20)]
}

/**
 * The home scene: the explorer reads in his tent, in the cold. Through the opening of the tent
 * lies the summit of the current expedition, with its name, its country and its altitude on a sign.
 */
export function TentScene({ mountain, percent, onStart, buttonLabel, children }: { mountain: MountainEntry; percent: number; onStart: () => void; buttonLabel: string; children?: ReactNode }) {
  const panorama = useMemo(() => renderPanorama(mountain), [mountain])
  const [starsA, starsB] = useMemo(() => twinkles(mountain.order * 11 + 3), [mountain.order])
  return <section className="tent-scene" aria-label={`Le camp de base, face au ${mountain.name}`}>
    <div className="tent-stage">
      <img className="tent-panorama" src={panorama} alt="" draggable={false} width={PANORAMA.width} height={PANORAMA.height} />
      <span className="tent-twinkle tent-twinkle-a" style={{ boxShadow: starsA }} aria-hidden="true" />
      <span className="tent-twinkle tent-twinkle-b" style={{ boxShadow: starsB }} aria-hidden="true" />
      <Snowfall seed={mountain.order * 5 + 2} columns={PANORAMA.width} rows={PANORAMA.height} density={1.6} />
      <img className="tent-base" src={asset('/illustrations/tent-base.png')} alt="L’explorateur lit dans sa tente, entre son sac, sa lanterne et son réchaud" draggable={false} />
      <img className="tent-head" src={asset('/illustrations/tent-head.png')} alt="" draggable={false} />
      <span className="tent-glow" aria-hidden="true" />
      <span className="tent-breath" aria-hidden="true"><i /><i /><i /></span>
      <span className="tent-steam" aria-hidden="true"><i /><i /></span>

      <div className="tent-sign">
        <span className="tent-sign-kicker">{mountain.entryType === 'route' ? 'ITINÉRAIRE' : 'MONTAGNE'} · {String(mountain.order).padStart(2, '0')} / 100</span>
        <strong className="tent-sign-name">{mountain.name}</strong>
        <span className="tent-sign-place">{mountain.country}</span>
        <span className="tent-sign-altitude"><PixelIcon name="summit" pixel={2} />{mountain.altitudeLabel ?? 'voie d’ascension'}</span>
        <span className="tent-sign-time">{formatHours(mountain.virtualDurationMinutes)} de travail</span>
        <span className="tent-sign-bar" role="progressbar" aria-label="Progression sur cette montagne" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{ width: `${percent}%` }} /></span>
        <span className="tent-sign-percent">{percent} %</span>
      </div>
    </div>
    <div className="tent-actions">
      <button className="pixel-button" onClick={onStart}>{buttonLabel}</button>
    </div>
    {children}
  </section>
}
