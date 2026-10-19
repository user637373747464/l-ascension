import { LOGO_GRID, LOGO_PALETTE } from './logoGrid'

const paths = (() => {
  const byColor = new Map<string, string[]>()
  LOGO_GRID.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const cell = row[x]
      if (cell === '.') { x += 1; continue }
      const start = x
      while (x < row.length && row[x] === cell) x += 1
      const list = byColor.get(cell) ?? []
      list.push(`M${start} ${y}h${x - start}v1h-${x - start}z`)
      byColor.set(cell, list)
    }
  })
  return [...byColor.entries()].map(([cell, parts]) => ({ fill: LOGO_PALETTE[cell], d: parts.join('') }))
})()

/** The Ascension logo, pixel by pixel. `pixel` is the size of one logo pixel in CSS pixels. */
export function PixelLogo({ pixel = 1, label }: { pixel?: number; label?: string }) {
  const side = LOGO_GRID.length * pixel
  return <svg className="pixel-logo" width={side} height={side} viewBox={`0 0 ${LOGO_GRID.length} ${LOGO_GRID.length}`} shapeRendering="crispEdges" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    {paths.map((entry) => <path key={entry.fill} fill={entry.fill} d={entry.d} />)}
  </svg>
}
