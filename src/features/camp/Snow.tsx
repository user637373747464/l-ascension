import { useMemo, type CSSProperties } from 'react'
import { rand } from './noise'

/**
 * Pixel snow. All the flakes of a layer are box-shadows of one tiny square; the square falls by whole art pixels and loops.
 * The parent defines `--px`, the size of one art pixel.
 */
export function SnowLayer({ seed = 1, columns = 120, rows = 150, flakes = 34, size = 1, seconds = 9, sway = 0 }: { seed?: number; columns?: number; rows?: number; flakes?: number; size?: number; seconds?: number; sway?: number }) {
  const shadows = useMemo(() => {
    const list: string[] = []
    for (let index = 0; index < flakes; index += 1) {
      const x = Math.floor(rand(seed, index, 1) * columns)
      const y = Math.floor(rand(seed, index, 2) * rows)
      const color = rand(seed, index, 3) > 0.7 ? '#cfe6fb' : '#ffffff'
      list.push(`calc(var(--px) * ${x}) calc(var(--px) * ${y}) 0 0 ${color}`)
      list.push(`calc(var(--px) * ${x}) calc(var(--px) * ${y - rows}) 0 0 ${color}`)
    }
    return list.join(',')
  }, [seed, columns, rows, flakes])
  const style = { '--snow-rows': rows, '--snow-size': size, '--snow-sway': sway, boxShadow: shadows, animationDuration: `${seconds}s` } as CSSProperties
  return <span className="snow-wrap" aria-hidden="true"><i className="snow-layer" style={style} /></span>
}

/** Three layers at different speeds and sizes: far, middle, close. */
export function Snowfall({ seed = 1, columns = 120, rows = 150, density = 1 }: { seed?: number; columns?: number; rows?: number; density?: number }) {
  return <div className="snowfall" aria-hidden="true">
    <SnowLayer seed={seed} columns={columns} rows={rows} flakes={Math.round(26 * density)} size={1} seconds={14} />
    <SnowLayer seed={seed + 1} columns={columns} rows={rows} flakes={Math.round(18 * density)} size={1} seconds={9} sway={3} />
    <SnowLayer seed={seed + 2} columns={columns} rows={rows} flakes={Math.round(9 * density)} size={2} seconds={6} sway={5} />
  </div>
}
