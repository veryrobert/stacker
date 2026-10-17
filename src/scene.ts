// The collage as data. Positions and sizes are in artboard-width units: x runs 0..1 across the
// artboard, y runs 0..1/ratio down it, so a layout survives any export size. Pieces may sit
// partly or wholly outside the artboard; exports crop to it.

export type Kind = 'image' | 'block' | 'circle' | 'grid' | 'cross'
export type CrossStyle = 'plus' | 'x' | 'reg'

export type Piece = {
  id: string
  kind: Kind
  x: number // centre
  y: number
  w: number
  h: number
  rot: number // degrees
  color: string // blocks, circles, grids, crosses
  imageId?: string // images: key into the image store
  crop: 'none' | 'circle' // images: as shot, or cut to a circle
  mono: boolean // images: black and white
  texture: number // 0..1, how printed the piece looks (grain, paper, softened blacks)
  show: number // 0..1, how much shows through from underneath
  blend: 'normal' | 'multiply' // multiply lets colours mix where pieces overlap
  edge: 'clean' | 'torn' // images and blocks: a straight cut, or a torn edge
  cross: CrossStyle
}

export const FORMATS = {
  '4:5': 4 / 5,
  '1:1': 1,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
  A4: 1 / Math.SQRT2,
} as const
export type Format = keyof typeof FORMATS

export type Texture = { grain: number; paper: number; dots: number; fade: number }

export type Scene = {
  format: Format
  bg: string
  pieces: Piece[]
  texture: Texture // over the whole artboard
  outside: 'hide' | 'show' // the editor: show pieces past the artboard edge (exports always crop)
}

export const defaultScene: Scene = {
  format: '4:5',
  bg: '#0e0e0e', // a very subtle off-black, just apart from the page
  pieces: [],
  texture: { grain: 0.35, paper: 0.25, dots: 0, fade: 0.1 },
  outside: 'hide',
}

// Colours that suit the references: printed greens, yellows, blues, warm paper, ink
export const SWATCHES = [
  ['#2f6b35', 'Green'], ['#f2d43d', 'Yellow'], ['#2f6fd6', 'Blue'], ['#e2502f', 'Red'],
  ['#d9d2c4', 'Stone'], ['#f4f1ea', 'Paper'], ['#1b1b1b', 'Ink'],
] as const

export const BG_SWATCHES = [
  ['#0e0e0e', 'Off black'], ['#f4f1ea', 'Paper'], ['#ffffff', 'White'], ['#e9e4d8', 'Cream'], ['#d9d2c4', 'Stone'],
  ['#1b1b1b', 'Ink'], ['#2f6b35', 'Green'],
] as const

export const height = (s: Scene) => 1 / FORMATS[s.format]

let seq = 0
export const newId = () => `p${Date.now().toString(36)}${(seq++).toString(36)}`

const base = (p: Partial<Piece>): Piece => ({
  id: newId(), kind: 'block', x: 0.5, y: 0.5, w: 0.4, h: 0.4, rot: 0, color: '#2f6b35',
  crop: 'none', mono: false, texture: 0, show: 0, blend: 'normal', edge: 'clean', cross: 'plus', ...p,
})

// Images arrive printed (a bit of texture, a little show-through) and fill most of the artboard:
// fitted inside 85% of it, whatever their shape
export function imagePiece(imageId: string, aspect: number, at: { x: number; y: number }, artH: number): Piece {
  const w = Math.min(0.85, 0.85 * artH * aspect)
  return base({ kind: 'image', imageId, x: at.x, y: at.y, w, h: w / aspect, texture: 0.6, show: 0.08 })
}

export function shapePiece(kind: Exclude<Kind, 'image'>, at: { x: number; y: number }, cross: CrossStyle = 'plus'): Piece {
  switch (kind) {
    case 'block': return base({ kind, x: at.x, y: at.y, w: 0.42, h: 0.62, color: '#2f6b35', texture: 0.5 })
    case 'circle': return base({ kind, x: at.x, y: at.y, w: 0.36, h: 0.36, color: '#2f6fd6', texture: 0.4, show: 0.1 })
    case 'grid': return base({ kind, x: at.x, y: at.y, w: 0.6, h: 0.22, color: '#1b1b1b', texture: 0.3 })
    case 'cross': return base({ kind, x: at.x, y: at.y, w: 0.06, h: 0.06, color: '#1b1b1b', cross })
  }
}

// A seeded random so a layout can be reproduced
export function rng(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

// Randomise: new positions, sizes, slight tilts and stacking order. Pieces are allowed to spill
// off the edges, as cut paper does; crosses stay small and upright.
export function randomise(scene: Scene, seed = Date.now()): Piece[] {
  const r = rng(seed), H = height(scene)
  const flat = scene.pieces.filter(p => p.kind !== 'cross'), marks = scene.pieces.filter(p => p.kind === 'cross')
  // Spread the pieces over the artboard: each gets its own cell of a jittered grid (in shuffled
  // order), so a shuffle covers the canvas instead of bunching, while sizes still overlap the cells
  const n = Math.max(1, flat.length), cols = Math.max(1, Math.round(Math.sqrt(n / H))), rows = Math.ceil(n / cols)
  const cells = Array.from({ length: cols * rows }, (_, i) => i)
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]] }
  const placed = flat.map((p, i) => {
    const c = cells[i] % cols, row = Math.floor(cells[i] / cols)
    const cx = (c + 0.5) / cols + (r() - 0.5) * (1.1 / cols), cy = ((row + 0.5) / rows + (r() - 0.5) * (1.1 / rows)) * H
    const aspect = p.w / p.h
    const w = p.kind === 'grid' ? 0.5 + r() * 0.45 : (1.25 / cols) * (0.8 + r() * 0.8) // generous: pieces overlap and fill the board
    const tilt = r() < 0.6 ? 0 : (r() - 0.5) * 7
    return { ...p, w, h: p.kind === 'circle' ? w : w / aspect, x: cx, y: cy, rot: tilt }
  })
  // Shuffle the stacking order, but keep crosses on top so they stay visible
  for (let i = placed.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [placed[i], placed[j]] = [placed[j], placed[i]] }
  const crosses = marks.map(p => ({ ...p, x: 0.08 + r() * 0.84, y: (0.06 + r() * 0.88) * H, rot: 0 }))
  return [...placed, ...crosses]
}
