import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { asset } from '../../assetUrl'

/** A line Tenzin says right now (after a purchase, for instance). `id` changes at every new reaction. */
export type TenzinReaction = { id: number; text: string }

const EMBERS = [
  { dx: -6, delay: 0, dur: 2.4 },
  { dx: 5, delay: -0.8, dur: 2.8 },
  { dx: 2, delay: -1.5, dur: 2.2 },
  { dx: -3, delay: -2.1, dur: 3 },
  { dx: 7, delay: -0.3, dur: 2.6 },
]

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * The shop picture with Tenzin brought to life: he blinks, talks in a pixel speech bubble (typed letter by letter),
 * rings his bell now and then, and the lamps and the stove flicker. Everything is laid over the picture in
 * percentages of the picture itself, so it stays glued to the right spot at every screen size.
 */
export function TenzinScene({ coins, reaction, children }: { coins: number; reaction: TenzinReaction | null; children?: ReactNode }) {
  const lines = useMemo(() => [
    'Namasté ! Entre te réchauffer.',
    coins === 0 ? 'Pas encore de galets ? Travaille, puis reviens me voir !' : `Tu as ${coins} galet${coins > 1 ? 's' : ''} : choisis bien !`,
    '1 galet pour chaque tranche de 10 minutes de travail.',
    'Le thé au beurre de yak te rapporte des galets chaque heure.',
    'Crampons, piolet, corde… plus tu montes vite, mieux c’est.',
    'Ne quitte pas l’ascension : tu perdrais ta progression !',
    'Valide ton sommet quand tu y es : chaque minute compte.',
  ], [coins])
  const reduced = useMemo(prefersReducedMotion, [])
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(0)
  const [override, setOverride] = useState<string | null>(null)
  const [dings, setDings] = useState(0)
  const line = override ?? lines[index % lines.length]

  useEffect(() => {
    if (!reaction) return
    setOverride(reaction.text)
    setShown(0)
    setDings((count) => count + 1)
  }, [reaction])

  useEffect(() => {
    if (!reduced && shown < line.length) {
      const timer = setTimeout(() => setShown((count) => count + 1), 42)
      return () => clearTimeout(timer)
    }
    const timer = setTimeout(() => {
      setOverride(null)
      setShown(0)
      setIndex((current) => current + 1)
    }, override ? 4200 : reduced ? 6500 : 3800)
    return () => clearTimeout(timer)
  }, [shown, line, reduced, override])

  const typed = reduced ? line : line.slice(0, shown)

  return <div className="shop-scene">
    <div className="shop-art">
      <img src={asset('/illustrations/sherpa/shop-interior-pixel.jpg')} alt="Intérieur pixel art de la boutique de montagne, avec Tenzin derrière son comptoir" draggable={false} />
      <i className="shop-glow glow-lamp" aria-hidden="true" />
      <i className="shop-glow glow-lantern" aria-hidden="true" />
      <i className="shop-glow glow-red" aria-hidden="true" />
      <i className="shop-glow glow-stove" aria-hidden="true" />
      {EMBERS.map((ember, index) => <i key={index} className="shop-ember" aria-hidden="true" style={{ '--dx': `${ember.dx}px`, animationDelay: `${ember.delay}s`, animationDuration: `${ember.dur}s` } as CSSProperties} />)}
      <i className="tenzin-blink blink-left" aria-hidden="true" />
      <i className="tenzin-blink blink-right" aria-hidden="true" />
      <span className="shop-ding" aria-hidden="true"><b>DING !</b><i /><i /><i /></span>
      {dings > 0 && <span className="shop-ding is-now" key={dings} aria-hidden="true"><b>DING !</b><i /><i /><i /></span>}
      <div className="tenzin-bubble" aria-hidden="true">
        <span className="bubble-ghost">{line}</span>
        <span className="bubble-typed">{typed}<em /></span>
      </div>
    </div>
    <div className="shop-scene-shade" />
    {children}
  </div>
}
