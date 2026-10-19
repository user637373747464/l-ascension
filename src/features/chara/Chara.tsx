import type { CSSProperties } from 'react'
import { asset } from '../../assetUrl'

/**
 * The explorer from the character design sheet.
 * Every frame comes straight from the sheet (public/sprites/chara/chara-atlas.png): nothing is redrawn,
 * the animations only alternate between the original poses and shift them by whole sprite pixels.
 */
export type CharaAnimation = 'rest' | 'walk' | 'run' | 'climb' | 'jump' | 'cheer' | 'tired' | 'alert'

export const CHARA_ATLAS = asset('/sprites/chara/chara-atlas.png')
export const CHARA_HERO = asset('/sprites/chara/chara-hero.png')
export const CHARA_PORTRAIT = asset('/sprites/chara/chara-portrait.png')

const labels: Record<CharaAnimation, string> = {
  rest: 'L’explorateur au repos',
  walk: 'L’explorateur marche',
  run: 'L’explorateur court',
  climb: 'L’explorateur grimpe',
  jump: 'L’explorateur saute',
  cheer: 'L’explorateur fête son sommet',
  tired: 'L’explorateur fait une pause',
  alert: 'L’explorateur remarque quelque chose',
}

/**
 * Size comes from the --chara-cell custom property (width of one atlas cell).
 * Put it on a parent, for instance `--chara-cell: 25cqw` inside a size container.
 */
export function Chara({ animation, facing = 1, className = '', style }: { animation: CharaAnimation; facing?: 1 | -1; className?: string; style?: CSSProperties }) {
  return <span className={`chara-holder ${className}`} data-facing={facing === -1 ? 'left' : 'right'} style={style}>
    <span className={`chara chara-${animation}`} role="img" aria-label={labels[animation]} />
  </span>
}
