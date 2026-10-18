import type { Piece, Scene } from './scene'
import { height } from './scene'

// One image, as loaded: the picture and a black-and-white copy, both kept to a sensible size
export type Img = { colour: HTMLCanvasElement; mono: HTMLCanvasElement; aspect: number }

const MAX_SIDE = 2400

export function prepareImage(el: HTMLImageElement): Img {
  const k = Math.min(1, MAX_SIDE / Math.max(el.naturalWidth, el.naturalHeight))
  const w = Math.max(1, Math.round(el.naturalWidth * k)), h = Math.max(1, Math.round(el.naturalHeight * k))
  const colour = document.createElement('canvas')
  colour.width = w; colour.height = h
  const g = colour.getContext('2d')!
  g.imageSmoothingQuality = 'high'
  g.drawImage(el, 0, 0, w, h)
  // Black and white, done once by hand: canvas filters aren't available in every browser
  const mono = document.createElement('canvas')
  mono.width = w; mono.height = h
  const d = g.getImageData(0, 0, w, h)
  for (let i = 0; i < d.data.length; i += 4) {
    const l = 0.2126 * d.data[i] + 0.7152 * d.data[i + 1] + 0.0722 * d.data[i + 2]
    d.data[i] = d.data[i + 1] = d.data[i + 2] = l
  }
  mono.getContext('2d')!.putImageData(d, 0, 0)
  return { colour, mono, aspect: w / h }
}

// ---------- Texture tiles, made once ----------
function tile(size: number, paint: (d: Uint8ClampedArray, size: number) => void) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const img = g.createImageData(size, size)
  paint(img.data, size)
  g.putImageData(img, 0, 0)
  return c
}
let tiles: { grain: HTMLCanvasElement; fibre: HTMLCanvasElement; dots: HTMLCanvasElement } | null = null
function getTiles() {
  if (tiles) return tiles
  const grain = tile(256, d => {
    for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255 }
  })
  // Paper fibres: soft horizontal streaks
  const fibre = tile(256, (d, s) => {
    for (let y = 0; y < s; y++) {
      let run = 0, v = 128
      for (let x = 0; x < s; x++) {
        if (run-- <= 0) { run = 6 + Math.random() * 30; v = 128 + (Math.random() - 0.5) * 60 }
        const i = (y * s + x) * 4
        d[i] = d[i + 1] = d[i + 2] = v + (Math.random() - 0.5) * 14; d[i + 3] = 255
      }
    }
  })
  // Print dots: a halftone screen on a 45° grid
  const dots = document.createElement('canvas')
  dots.width = dots.height = 12
  const g = dots.getContext('2d')!
  g.fillStyle = '#fff'; g.fillRect(0, 0, 12, 12)
  g.fillStyle = '#000'
  for (const [x, y] of [[0, 0], [12, 0], [0, 12], [12, 12], [6, 6]]) { g.beginPath(); g.arc(x, y, 2.4, 0, Math.PI * 2); g.fill() }
  tiles = { grain, fibre, dots }
  return tiles
}

// A texture pattern scaled to the artboard, so grain looks the same at any export size
function pattern(g: CanvasRenderingContext2D, src: HTMLCanvasElement, unit: number, scale = 1) {
  const p = g.createPattern(src, 'repeat')!
  const k = (unit / 1400) * scale
  p.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]))
  return p
}

// ---------- Pieces ----------
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)

function shapePath(g: CanvasRenderingContext2D, p: Piece, w: number, h: number) {
  g.beginPath()
  if (p.kind === 'circle' || (p.kind === 'image' && p.crop === 'circle')) {
    const r = p.kind === 'circle' ? Math.min(w, h) / 2 : Math.min(w, h) / 2
    g.ellipse(0, 0, p.kind === 'circle' ? w / 2 : r, p.kind === 'circle' ? h / 2 : r, 0, 0, Math.PI * 2)
  } else if (p.edge === 'torn' && (p.kind === 'image' || p.kind === 'block')) tornRect(g, p, w, h)
  else g.rect(-w / 2, -h / 2, w, h)
}

// A torn edge: small irregular bites along each side, the same every time for a given piece
function tornRect(g: CanvasRenderingContext2D, p: Piece, w: number, h: number) {
  let s = Math.abs(hash(p.id)) || 1
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  const amp = Math.min(w, h) * 0.012, step = Math.max(3, Math.min(w, h) * 0.018)
  const side = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / step))
    for (let i = 1; i <= n; i++) {
      const t = i / n, d = (r() - 0.35) * amp * (r() < 0.12 ? 2.4 : 1)
      g.lineTo(x0 + (x1 - x0) * t - nx * d, y0 + (y1 - y0) * t - ny * d)
    }
  }
  const L = -w / 2, R = w / 2, T = -h / 2, B = h / 2
  g.moveTo(L, T)
  side(L, T, R, T, 0, -1)
  side(R, T, R, B, 1, 0)
  side(R, B, L, B, 0, 1)
  side(L, B, L, T, -1, 0)
  g.closePath()
}

function drawContent(g: CanvasRenderingContext2D, p: Piece, w: number, h: number, img: Img | undefined, unit: number) {
  switch (p.kind) {
    case 'image': {
      if (!img) { g.fillStyle = '#ccc'; g.fillRect(-w / 2, -h / 2, w, h); return }
      const src = p.mono ? img.mono : img.colour
      // Circle crops fill a square with the picture's middle
      const bw = p.crop === 'circle' ? Math.min(w, h) : w, bh = p.crop === 'circle' ? Math.min(w, h) : h
      const s = Math.max(bw / src.width, bh / src.height)
      g.imageSmoothingQuality = 'high'
      g.drawImage(src, (-src.width * s) / 2, (-src.height * s) / 2, src.width * s, src.height * s)
      return
    }
    case 'block':
    case 'circle':
      g.fillStyle = p.color
      g.fill()
      return
    case 'grid': {
      // Like a scorecard: a ruled grid with cells about square
      const cols = Math.max(2, Math.round(w / (h / 3))), rows = 3
      g.strokeStyle = p.color
      g.lineWidth = Math.max(1, unit * 0.0016)
      g.beginPath()
      for (let c = 0; c <= cols; c++) { const x = -w / 2 + (c * w) / cols; g.moveTo(x, -h / 2); g.lineTo(x, h / 2) }
      for (let r = 0; r <= rows; r++) { const y = -h / 2 + (r * h) / rows; g.moveTo(-w / 2, y); g.lineTo(w / 2, y) }
      g.stroke()
      return
    }
    case 'cross': {
      const s = Math.min(w, h) / 2
      g.strokeStyle = p.color
      g.lineWidth = Math.max(1, unit * 0.0022)
      g.lineCap = 'butt'
      g.beginPath()
      if (p.cross === 'x') { g.moveTo(-s, -s); g.lineTo(s, s); g.moveTo(s, -s); g.lineTo(-s, s) }
      else { g.moveTo(-s, 0); g.lineTo(s, 0); g.moveTo(0, -s); g.lineTo(0, s) }
      if (p.cross === 'reg') { g.moveTo(s * 0.55, 0); g.arc(0, 0, s * 0.55, 0, Math.PI * 2) }
      g.stroke()
      return
    }
  }
}

// Printed feel on a piece: grain, a little paper warmth, and blacks lifted the way ink sits on paper
function printPiece(g: CanvasRenderingContext2D, p: Piece, w: number, h: number, unit: number) {
  const t = p.texture
  if (!t || p.kind === 'grid' || p.kind === 'cross') return
  const T = getTiles()
  g.save()
  shapePath(g, p, w, h)
  g.clip()
  g.globalAlpha = t * 0.35
  g.globalCompositeOperation = 'overlay'
  g.fillStyle = pattern(g, T.grain, unit)
  g.fillRect(-w / 2, -h / 2, w, h)
  g.globalAlpha = t * 0.18
  g.globalCompositeOperation = 'multiply'
  g.fillStyle = '#e9dcc0'
  g.fillRect(-w / 2, -h / 2, w, h)
  g.globalAlpha = t * 0.14
  g.globalCompositeOperation = 'screen'
  g.fillStyle = '#3a3630'
  g.fillRect(-w / 2, -h / 2, w, h)
  g.restore()
}

export type Arrival = { time: number } // seconds into the arrival animation

// ---------- Arrival, on a beat ----------
// Pieces cut in on the beat, with no fades or slides (see Anim in scene.ts). One piece per beat;
// the drawing order stays the stacking order even when pieces arrive in a random order.
const LEAD = 0.2 // empty board before the first beat
const WINDOW = 3 // the window style shows this many of the newest pieces
const BUMP = 1 / 15 // a bump lasts two frames at 30fps

export function arrivalLength(s: Scene) {
  const a = s.anim, n = s.pieces.length
  // the last piece lands on beat n-1; one more beat (window: everything cuts in), then the hold
  return LEAD + n * a.beat + a.hold + (a.style === 'build' ? a.beat : 0) // build: a beat of empty board to loop on
}

// Each piece's place in the arrival order
function ranks(s: Scene): number[] {
  const n = s.pieces.length, order = Array.from({ length: n }, (_, i) => i)
  if (s.anim.order === 'random') {
    let q = (s.anim.seed % 2147483646) + 1
    const r = () => (q = (q * 16807) % 2147483647) / 2147483647
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]] }
  }
  const rank = new Array<number>(n)
  order.forEach((piece, r) => { rank[piece] = r })
  return rank
}

function arrivalState(s: Scene, rank: number, t: number): { show: boolean; bump: boolean } {
  const a = s.anim, n = s.pieces.length, start = LEAD + rank * a.beat, allIn = LEAD + n * a.beat
  if (t < start) return { show: false, bump: false }
  if (a.style === 'window' && t < allIn) {
    const beat = Math.floor((t - LEAD) / a.beat)
    return { show: rank > beat - WINDOW, bump: false }
  }
  if (a.style === 'build' && t >= allIn + a.hold) return { show: false, bump: false }
  return { show: true, bump: a.style === 'bump' && t - start < BUMP }
}

function drawPiece(g: CanvasRenderingContext2D, p: Piece, unit: number, img: Img | undefined, bump = false) {
  const w = p.w * unit, h = p.h * unit
  g.save()
  g.translate(p.x * unit, p.y * unit)
  g.rotate((p.rot * Math.PI) / 180)
  if (bump) g.scale(1.05, 1.05) // one frame big, then full size: a hard cut, not an ease
  g.globalAlpha = 1 - p.show
  g.globalCompositeOperation = p.blend === 'multiply' ? 'multiply' : 'source-over'
  if (p.kind === 'image' || p.kind === 'block' || p.kind === 'circle') {
    shapePath(g, p, w, h)
    g.save(); g.clip(); drawContent(g, p, w, h, img, unit); g.restore()
  } else drawContent(g, p, w, h, img, unit)
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  printPiece(g, p, w, h, unit)
  g.restore()
}

// ---------- The artboard's own textures ----------
function textureArtboard(g: CanvasRenderingContext2D, s: Scene, unit: number) {
  const T = getTiles(), W = unit, H = height(s) * unit, t = s.texture
  g.save()
  if (t.paper) {
    g.globalCompositeOperation = 'multiply'
    g.globalAlpha = t.paper * 0.35
    g.fillStyle = '#efe4cc'; g.fillRect(0, 0, W, H)
    g.globalCompositeOperation = 'soft-light'
    g.globalAlpha = t.paper * 0.6
    g.fillStyle = pattern(g, T.fibre, unit, 2); g.fillRect(0, 0, W, H)
  }
  if (t.dots) {
    g.globalCompositeOperation = 'multiply'
    g.globalAlpha = t.dots * 0.28
    g.fillStyle = pattern(g, T.dots, unit, 1.6); g.fillRect(0, 0, W, H)
  }
  if (t.grain) {
    g.globalCompositeOperation = 'overlay'
    g.globalAlpha = t.grain * 0.4
    g.fillStyle = pattern(g, T.grain, unit); g.fillRect(0, 0, W, H)
  }
  if (t.fade) {
    g.globalCompositeOperation = 'screen'
    g.globalAlpha = t.fade * 0.5
    g.fillStyle = '#3c3a36'; g.fillRect(0, 0, W, H)
  }
  g.restore()
}

// Draw the scene with the artboard's top-left at the context origin, `unit` pixels per artboard width.
// clip: crop to the artboard (exports); otherwise pieces past the edges are drawn too (the editor).
export function drawScene(
  g: CanvasRenderingContext2D,
  s: Scene,
  images: Map<string, Img>,
  unit: number,
  { clip = true, arrival }: { clip?: boolean; arrival?: Arrival } = {},
) {
  const W = unit, H = height(s) * unit
  g.save()
  g.fillStyle = s.bg
  g.fillRect(0, 0, W, H)
  if (clip) { g.beginPath(); g.rect(0, 0, W, H); g.clip() }
  const rank = arrival ? ranks(s) : []
  s.pieces.forEach((p, i) => {
    const st = arrival ? arrivalState(s, rank[i], arrival.time) : { show: true, bump: false }
    if (st.show) drawPiece(g, p, unit, p.imageId ? images.get(p.imageId) : undefined, st.bump)
  })
  g.restore()
  // Artboard textures sit on top of everything, inside the artboard only
  g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip()
  textureArtboard(g, s, unit)
  g.restore()
}


// ---------- Hit testing, in artboard units ----------
export function toLocal(p: Piece, x: number, y: number) {
  const a = (-p.rot * Math.PI) / 180, dx = x - p.x, dy = y - p.y
  return { lx: dx * Math.cos(a) - dy * Math.sin(a), ly: dx * Math.sin(a) + dy * Math.cos(a) }
}

export function hitPiece(p: Piece, x: number, y: number, slop = 0) {
  const { lx, ly } = toLocal(p, x, y)
  const hw = p.w / 2 + slop, hh = p.h / 2 + slop
  // Small marks get a generous target
  if (p.kind === 'cross') return Math.abs(lx) < Math.max(hw, 0.03) && Math.abs(ly) < Math.max(hh, 0.03)
  if (p.kind === 'circle') return (lx / hw) ** 2 + (ly / hh) ** 2 <= 1
  if (p.kind === 'image' && p.crop === 'circle') { const r = Math.min(p.w, p.h) / 2 + slop; return lx * lx + ly * ly <= r * r }
  return Math.abs(lx) <= hw && Math.abs(ly) <= hh
}
