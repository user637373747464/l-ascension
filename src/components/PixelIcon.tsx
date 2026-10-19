/** Small icons drawn pixel by pixel from a character grid, in the same style as the character sheet. */
type Grid = readonly string[]
type Palette = Record<string, string>

const summit: { grid: Grid; palette: Palette } = {
  grid: [
    '.........oooo...',
    '.........ooo....',
    '.........oooo...',
    '.........k......',
    '......ww.k......',
    '.....wwwwk......',
    '....wwBwwwk.....',
    '...wwBBwwwwk....',
    '..wwBBBBwwwww...',
    '.wBBBBBBBBwwww..',
    'BBBBBBBBBBBBBBB.',
  ],
  palette: { o: '#ef8a22', k: '#22364a', w: '#f4f8fb', B: '#4a7fae' },
}

const pebble: { grid: Grid; palette: Palette } = {
  grid: [
    '..kkkkkk..',
    '.kGGGGGGk.',
    'kGGhhGGGGk',
    'kGGGGGGGGk',
    '.kGGGGGGk.',
    '..kkkkkk..',
  ],
  palette: { k: '#2e3d4d', G: '#8c9eae', h: '#c8d4dd' },
}

const tent: { grid: Grid; palette: Palette } = {
  grid: [
    '.......oo.......',
    '......oooo......',
    '.....ooOOoo.....',
    '....ooOOOOoo....',
    '...oooOkkOooo...',
    '..ooooOkkOoooo..',
    '.oooooOkkOooooo.',
    'oooooooOOOoooooo',
  ],
  palette: { o: '#e8892b', O: '#b85a22', k: '#22364a' },
}

const icons = { summit, pebble, tent }
export type PixelIconName = keyof typeof icons

export function pixelIconSize(name: PixelIconName) {
  const { grid } = icons[name]
  return { columns: grid[0].length, rows: grid.length }
}

/** Rects for use inside an existing <svg>, with each pixel as `unit` user units. */
export function PixelIconRects({ name, unit = 1 }: { name: PixelIconName; unit?: number }) {
  const { grid, palette } = icons[name]
  return <>{grid.flatMap((row, y) => [...row].map((cell, x) => cell === '.' ? null : <rect key={`${x}-${y}`} x={x * unit} y={y * unit} width={unit} height={unit} fill={palette[cell]} />))}</>
}

export function PixelIcon({ name, pixel = 2, label }: { name: PixelIconName; pixel?: number; label?: string }) {
  const { columns, rows } = pixelIconSize(name)
  return <svg className="pixel-icon" width={columns * pixel} height={rows * pixel} viewBox={`0 0 ${columns} ${rows}`} shapeRendering="crispEdges" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    <PixelIconRects name={name} />
  </svg>
}
