// Textures: scans you load (kept in this browser) and built-ins generated here, so nothing licensed
// is bundled. Each texture is prepared for its blend mode, the standard way texture scans are applied:
//   multiply   the texture's base is lifted to white, so only its darks (fibres, dots) print
//   overlay /  centred on mid-grey, so it adds detail without making the image lighter or darker
//   soft-light
//   screen     the base is pushed to black, so only its lights (dust, specks) show
// Neutral strips the texture's own colour (the usual default); Original keeps it.

export type Blend = 'multiply' | 'overlay' | 'soft-light' | 'screen'
export type TextureLayer = { source: string; blend: Blend; amount: number; scale: number; colour: 'neutral' | 'original' }

export const BLENDS: { value: Blend; label: string }[] = [
  { value: 'multiply', label: 'Multiply' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'soft-light', label: 'Soft' },
  { value: 'screen', label: 'Screen' },
]

export type TextureSource = {
  id: string
  name: string
  user: boolean
  base: HTMLCanvasElement // as loaded or generated
  // how wide it should read across the artboard at scale 1 (built-ins are fine; scans cover the board)
  span: number // fraction of the artboard width one copy covers
}

// ---------- Built-ins ----------
function canvas(w: number, h = w) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}
function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

// Fine film grain
function grain() {
  const c = canvas(512), g = c.getContext('2d')!, img = g.createImageData(512, 512), r = seeded(7)
  for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (r() - 0.5) * 120; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255 }
  g.putImageData(img, 0, 0)
  return c
}

// Recycled paper: mottled ground, specks and short fibres
function paper() {
  const S = 1024, c = canvas(S), g = c.getContext('2d')!, r = seeded(11)
  g.fillStyle = '#c9c3bb'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 260; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 160, gr = g.createRadialGradient(x, y, 0, x, y, rad)
    const d = r() < 0.5 ? '0,0,0' : '255,255,255'
    gr.addColorStop(0, `rgba(${d},0.035)`); gr.addColorStop(1, `rgba(${d},0)`)
    g.fillStyle = gr; g.fillRect(0, 0, S, S)
  }
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(40,36,32,${0.15 + r() * 0.5})`
    const s = 0.6 + r() * 1.6; g.fillRect(r() * S, r() * S, s, s)
  }
  g.lineCap = 'round'
  for (let i = 0; i < 900; i++) {
    const x = r() * S, y = r() * S, a = r() * Math.PI * 2, l = 3 + r() * 9
    g.strokeStyle = r() < 0.75 ? `rgba(50,44,38,${0.12 + r() * 0.3})` : `rgba(255,255,255,${0.25 + r() * 0.3})`
    g.lineWidth = 0.6 + r() * 0.6
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.6, y + Math.sin(a + 0.6) * l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke()
  }
  return c
}

// Knit: rows of small V stitches
function knit() {
  const S = 512, c = canvas(S), g = c.getContext('2d')!, r = seeded(5)
  g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, S, S)
  const sw = 8, sh = 9
  for (let y = 0; y < S; y += sh) for (let x = 0; x < S; x += sw) {
    const v = 150 + (r() - 0.5) * 50
    g.strokeStyle = `rgb(${v},${v},${v})`
    g.lineWidth = 2.6
    g.beginPath(); g.moveTo(x + 1, y + 1); g.lineTo(x + sw / 2, y + sh - 1); g.lineTo(x + sw - 1, y + 1); g.stroke()
    g.strokeStyle = 'rgba(40,40,40,0.35)'; g.lineWidth = 0.8
    g.beginPath(); g.moveTo(x + sw / 2, y + 2); g.lineTo(x + sw / 2, y + sh - 2); g.stroke()
  }
  return c
}

// Irregular fine dots, like a stippled print
function dots() {
  const S = 768, c = canvas(S), g = c.getContext('2d')!, r = seeded(3)
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S)
  const pitch = 4.2
  for (let y = 0; y < S; y += pitch) for (let x = 0; x < S; x += pitch) {
    if (r() < 0.38) continue
    g.fillStyle = `rgba(90,90,90,${0.35 + r() * 0.5})`
    g.beginPath(); g.ellipse(x + (r() - 0.5) * 1.6, y + (r() - 0.5) * 1.6, 0.8 + r() * 0.9, 0.7 + r() * 0.7, r() * 3, 0, Math.PI * 2); g.fill()
  }
  return c
}

// Fine halftone: a 45° dot screen, far finer than a visible pattern; scale it up for a coarser screen
function halftone() {
  const S = 512, c = canvas(S), g = c.getContext('2d')!
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S)
  g.fillStyle = '#5a5a5a'
  const pitch = 4 // px per dot at scale 1, drawn on a rotated grid
  g.translate(S / 2, S / 2); g.rotate(Math.PI / 4)
  const R = S
  for (let y = -R; y < R; y += pitch) for (let x = -R; x < R; x += pitch) {
    g.beginPath(); g.arc(x, y, pitch * 0.32, 0, Math.PI * 2); g.fill()
  }
  return c
}

let builtins: TextureSource[] | null = null
export function builtinTextures(): TextureSource[] {
  builtins ??= [
    { id: 'grain', name: 'Grain', user: false, base: grain(), span: 0.25 },
    { id: 'paper', name: 'Paper', user: false, base: paper(), span: 0.8 },
    { id: 'knit', name: 'Knit', user: false, base: knit(), span: 0.35 },
    { id: 'dots', name: 'Dots', user: false, base: dots(), span: 0.45 },
    { id: 'halftone', name: 'Halftone', user: false, base: halftone(), span: 0.22 },
  ]
  return builtins
}

// A loaded scan: kept to a sensible size; one copy covers the artboard at scale 1
export function userTexture(id: string, name: string, el: HTMLImageElement): TextureSource {
  const k = Math.min(1, 2400 / Math.max(el.naturalWidth, el.naturalHeight))
  const c = canvas(Math.round(el.naturalWidth * k), Math.round(el.naturalHeight * k))
  c.getContext('2d')!.drawImage(el, 0, 0, c.width, c.height)
  return { id, name, user: true, base: c, span: 1 }
}

// ---------- Preparing a texture for its blend mode ----------
const prepared = new Map<string, HTMLCanvasElement>()

function percentile(hist: Uint32Array, total: number, p: number) {
  let acc = 0
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= total * p) return i }
  return 255
}

export function prepare(src: TextureSource, blend: Blend, colour: 'neutral' | 'original'): HTMLCanvasElement {
  const mode = blend === 'soft-light' ? 'overlay' : blend
  const key = `${src.id}|${mode}|${colour}`
  const hit = prepared.get(key)
  if (hit) return hit
  const { width: w, height: h } = src.base
  const out = canvas(w, h), g = out.getContext('2d')!
  g.drawImage(src.base, 0, 0)
  const d = g.getImageData(0, 0, w, h), px = d.data, n = w * h
  const lum = new Float32Array(n), hist = new Uint32Array(256)
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const l = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]
    lum[j] = l; hist[Math.min(255, Math.round(l))]++
  }
  // Map each pixel's lightness to its new value for this blend mode
  let map: (l: number) => number
  if (mode === 'multiply') {
    const white = Math.max(1, percentile(hist, n, 0.9)) // the paper's base becomes white
    map = l => Math.min(255, (l / white) * 255)
  } else if (mode === 'screen') {
    const black = percentile(hist, n, 0.1) // the base becomes black
    map = l => Math.max(0, ((l - black) / Math.max(1, 255 - black)) * 255)
  } else {
    let sum = 0
    for (let j = 0; j < n; j++) sum += lum[j]
    const mean = sum / n // centred on mid-grey: no overall brightening or darkening
    map = l => Math.max(0, Math.min(255, 128 + (l - mean) * 1.4))
  }
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const t = map(lum[j])
    if (colour === 'neutral' || lum[j] < 1) { px[i] = px[i + 1] = px[i + 2] = t }
    else { const k = t / lum[j]; px[i] = Math.min(255, px[i] * k); px[i + 1] = Math.min(255, px[i + 1] * k); px[i + 2] = Math.min(255, px[i + 2] * k) }
    px[i + 3] = 255
  }
  g.putImageData(d, 0, 0)
  prepared.set(key, out)
  return out
}

export function forgetTexture(id: string) {
  for (const k of [...prepared.keys()]) if (k.startsWith(id + '|')) prepared.delete(k)
}

// Fill the current clip with a texture layer, laid out across the artboard (origin at its top-left,
// `unit` pixels per artboard width), so every piece shares one sheet
export function paintTexture(g: CanvasRenderingContext2D, layer: TextureLayer, src: TextureSource, unit: number, w: number, h: number, x = 0, y = 0) {
  if (!layer.amount) return
  const tex = prepare(src, layer.blend, layer.colour)
  const p = g.createPattern(tex, 'repeat')
  if (!p) return
  const k = (unit * src.span * layer.scale) / tex.width
  p.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]))
  g.save()
  g.globalCompositeOperation = layer.blend
  g.globalAlpha = layer.amount
  g.fillStyle = p
  g.fillRect(x, y, w, h)
  g.restore()
}
