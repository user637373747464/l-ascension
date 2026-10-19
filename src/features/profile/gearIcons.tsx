/** Pixel-art icons of the shop items that are not on the sprite sheet: gloves and food. Drawn from character grids. */
type Grid = readonly string[]
type Palette = Record<string, string>

const MITTEN: Grid = [
  '................',
  '.....kkkkkk.....',
  '....kMMMMMMk....',
  '....kMMhhMMk....',
  '...kMMMMMMMMkk..',
  '...kMMMMMMMMMMk.',
  '..kkMMMMMMMMMMk.',
  '.kTkMMMMMMMMMMk.',
  '.kTTkMMMMMMMMMk.',
  '.kTTTkMMMMMMMk..',
  '..kTTkMMMMMMk...',
  '...kkkCCCCCCk...',
  '....kCCCCCCCCk..',
  '....kCllCllCCk..',
  '....kCCCCCCCCk..',
  '.....kkkkkkkk...',
]

const FLASK: Grid = [
  '................',
  '.....kkkkk......',
  '....kRRRRRk.....',
  '....kRhRRRk.....',
  '....kkkkkkk.....',
  '...kSSSSSSSk....',
  '...kShSSSSSk....',
  '...kShSSSSSk....',
  '...kSSSSSSSk....',
  '...kSSBBBSSk....',
  '...kSSBwBSSk....',
  '...kSSBBBSSk....',
  '...kSSSSSSSk....',
  '...kDDDDDDDk....',
  '....kkkkkkk.....',
  '................',
]

const BARS: Grid = [
  '................',
  '................',
  '..kkkkkkkkkkkk..',
  '.kOOOOOOOOOOOOk.',
  '.kOhhhhOOOOOOOk.',
  '.kOOOOOOOwwwOOk.',
  '.kOOOOOOOwOwOOk.',
  '.kDDDDDDDDDDDDk.',
  '..kkkkkkkkkkkk..',
  '..kkkkkkkkkkkk..',
  '.kGGGGGGGGGGGGk.',
  '.kGhhhhGGGGGGGk.',
  '.kGGGGGGGnnnGGk.',
  '.kDDDDDDDDDDDDk.',
  '..kkkkkkkkkkkk..',
  '................',
]

const POUCH: Grid = [
  '................',
  '..k.k.k.k.k.k...',
  '.kkkkkkkkkkkkk..',
  '.kPPPPPPPPPPPk..',
  '.kPhhPPPPPPPPk..',
  '.kPPPPooooPPPk..',
  '.kPPPoOOOOoPPk..',
  '.kPPPoOyyOoPPk..',
  '.kPPPoOOOOoPPk..',
  '.kPPPPooooPPPk..',
  '.kPPPPPPPPPPPk..',
  '.kDDDDDDDDDDDk..',
  '.kkkkkkkkkkkkk..',
  '................',
  '................',
  '................',
]

const icons: Record<string, { grid: Grid; palette: Palette }> = {
  'gants-marche': { grid: MITTEN, palette: { k: '#2b2f3a', M: '#c4733a', h: '#e8a066', T: '#b25f2c', C: '#6d4a35', l: '#8c6446' } },
  'gants-glacier': { grid: MITTEN, palette: { k: '#1d2b3e', M: '#3d79b5', h: '#7db4e0', T: '#316a9f', C: '#263a55', l: '#4a6a96' } },
  'moufles-sommet': { grid: MITTEN, palette: { k: '#2a1a1a', M: '#d8452f', h: '#f58a6c', T: '#b83a28', C: '#f0f0f0', l: '#b9c6d2' } },
  barres: { grid: BARS, palette: { k: '#33241a', O: '#e08a2a', h: '#f6c27a', w: '#fff3d0', D: '#a85a1c', G: '#6a9a45', n: '#fff3d0' } },
  'the-beurre': { grid: FLASK, palette: { k: '#1d2b3e', R: '#c8432f', h: '#f08a70', S: '#9fb2c2', B: '#e8a43a', w: '#fff3d0', D: '#5d6f82' } },
  festin: { grid: POUCH, palette: { k: '#33241a', P: '#e6d3a8', h: '#fff3d0', o: '#c45a2a', O: '#e88a3a', y: '#ffd36b', D: '#b49a6a' } },
}

export const PIXEL_GEAR_IDS = Object.keys(icons)

export function GearPixel({ id, className = '', label }: { id: string; className?: string; label: string }) {
  const icon = icons[id]
  if (!icon) return null
  const { grid, palette } = icon
  return <svg className={`gear-sprite gear-pixel ${className}`} viewBox={`0 0 ${grid[0].length} ${grid.length}`} role="img" aria-label={label} shapeRendering="crispEdges">
    {grid.flatMap((row, y) => [...row].map((cell, x) => cell === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[cell] ?? '#000'} />))}
  </svg>
}
