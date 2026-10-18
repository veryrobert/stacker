import { useEffect, useRef, useState } from 'react'
import { arrivalLength, drawScene, hitPiece, type Img } from '@/render'
import type { TextureSource } from '@/textures'
import { height, type Piece, type Scene } from '@/scene'

type Props = {
  scene: Scene
  images: Map<string, Img>
  textures: Map<string, TextureSource>
  version: number // bumps when an image finishes loading
  selected: string | null
  onSelect: (id: string | null) => void
  onChange: (id: string, patch: Partial<Piece>) => void // live, during a gesture
  onCommit: () => void // a gesture ended: worth an undo step
  onDropFiles: (files: File[], at: { x: number; y: number }) => void
  inset: { right: number; bottom: number } // space taken by an open panel
  phone: boolean
  play: number // bump to preview the arrival animation
  onPlayEnd: () => void
}

// Figma-style handles: small squares on the corners scale; just outside any corner rotates
const HANDLE = 7 // px, corner square
const GRAB = 6 // px around a corner that counts as its handle
const ROTATE_RING = 22 // px past a corner where dragging rotates

// Rotate cursor, Figma-style: a quarter arc with an arrowhead at each end, black with a white halo.
// Drawn for the top-left corner, then turned to face whichever corner the pointer is at.
const rotateCursors = new Map<number, string>()
function rotateCursor(deg: number) {
  const k = ((Math.round(deg / 15) * 15) % 360 + 360) % 360
  let c = rotateCursors.get(k)
  if (!c) {
    const arc = 'M7 16.5A9.5 9.5 0 0 1 16.5 7M4.6 14.1L7 16.6L9.4 14.1M14.1 4.6L16.6 7L14.1 9.4'
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g transform="rotate(${k} 12 12)" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${arc}" stroke="white" stroke-width="3.6"/><path d="${arc}" stroke="black" stroke-width="1.4"/></g></svg>`
    c = `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, auto`
    rotateCursors.set(k, c)
  }
  return c
}

type Corner = { x: number; y: number; sx: number; sy: number } // screen point, and which corner (±1, ±1)

type Gesture =
  | { mode: 'move'; id: string; sx: number; sy: number; px: number; py: number }
  | { mode: 'scale'; id: string; corner: Corner; ax: number; ay: number; d0: number; w0: number; h0: number; x0: number; y0: number }
  | { mode: 'rotate'; id: string; a0: number; r0: number }
  | { mode: 'pinch'; id: string; d0: number; a0: number; w0: number; h0: number; r0: number }

export function Stage({ scene, images, textures, version, selected, onSelect, onChange, onCommit, onDropFiles, inset, phone, play, onPlayEnd }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  const [time, setTime] = useState<number | null>(null) // arrival preview clock
  const gesture = useRef<Gesture | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const moved = useRef(false)

  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  // The artboard fitted into the space left by the bars and any open panel
  const margin = phone ? { l: 16, r: 16, t: 20, b: 132 } : { l: 72, r: 72, t: 36, b: 104 }
  const availW = Math.max(80, size.w - margin.l - margin.r - inset.right)
  const availH = Math.max(80, size.h - margin.t - margin.b - (inset.bottom ? inset.bottom - margin.b + 24 : 0))
  const H = height(scene)
  const unit = Math.min(availW, availH / H)
  const ab = { x: margin.l + (availW - unit) / 2, y: margin.t + (availH - unit * H) / 2, w: unit, h: unit * H }

  // Arrival preview
  useEffect(() => {
    if (!play) return
    const length = arrivalLength(scene), t0 = performance.now()
    let raf = 0
    const tick = () => {
      const t = (performance.now() - t0) / 1000
      if (t >= length) { setTime(null); onPlayEnd(); return }
      setTime(t)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play])

  // Draw
  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    c.width = Math.round(size.w * dpr)
    c.height = Math.round(size.h * dpr)
    const g = c.getContext('2d')!
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, size.w, size.h)
    g.save()
    g.translate(ab.x, ab.y)
    const showOutside = scene.outside === 'show'
    drawScene(g, scene, images, unit, { clip: !showOutside, arrival: time === null ? undefined : { time }, textures })
    g.restore()
    // Outside the artboard: hidden by default; when shown, dimmed so it reads as cropped
    g.save()
    if (showOutside) {
      g.beginPath()
      g.rect(0, 0, size.w, size.h)
      g.rect(ab.x, ab.y, ab.w, ab.h)
      g.fillStyle = 'rgba(0,0,0,0.66)'
      g.fill('evenodd')
    }
    g.strokeStyle = 'rgba(255,255,255,0.12)'
    g.lineWidth = 1
    g.strokeRect(ab.x - 0.5, ab.y - 0.5, ab.w + 1, ab.h + 1)
    g.restore()
    // Selection frame and handles (never in exports)
    const p = scene.pieces.find(q => q.id === selected)
    if (p && time === null) {
      const w = p.w * unit, h = p.h * unit
      g.save()
      g.translate(ab.x + p.x * unit, ab.y + p.y * unit)
      g.rotate((p.rot * Math.PI) / 180)
      // A thin outline (white over a dark keyline, so it reads on any image) and four corner squares
      g.lineWidth = 1
      g.strokeStyle = 'rgba(0,0,0,0.35)'
      g.strokeRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2)
      g.strokeStyle = '#ecebe8'
      g.strokeRect(-w / 2, -h / 2, w, h)
      for (const [x, y] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) {
        g.fillStyle = '#ffffff'
        g.fillRect(x - HANDLE / 2, y - HANDLE / 2, HANDLE, HANDLE)
        g.strokeStyle = 'rgba(0,0,0,0.6)'
        g.strokeRect(x - HANDLE / 2 + 0.5, y - HANDLE / 2 + 0.5, HANDLE - 1, HANDLE - 1)
      }
      g.restore()
    }
  }, [scene, images, textures, version, selected, size, unit, ab.x, ab.y, ab.w, ab.h, time])

  // Screen point to artboard units
  const toArt = (sx: number, sy: number) => ({ x: (sx - ab.x) / unit, y: (sy - ab.y) / unit })
  const frame = (p: Piece) => {
    const a = (p.rot * Math.PI) / 180, cx = ab.x + p.x * unit, cy = ab.y + p.y * unit
    const at = (lx: number, ly: number) => ({ x: cx + lx * Math.cos(a) - ly * Math.sin(a), y: cy + lx * Math.sin(a) + ly * Math.cos(a) })
    const corners: Corner[] = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => ({ ...at((sx * p.w * unit) / 2, (sy * p.h * unit) / 2), sx, sy }))
    return { corners, cx, cy, at }
  }
  // What's under the pointer on the selected piece: a corner to scale, a corner to rotate, or nothing
  const zone = (p: Piece, x: number, y: number, touch: boolean): { kind: 'scale' | 'rotate'; corner: Corner } | null => {
    const f = frame(p), grab = GRAB + (touch ? 8 : 0)
    for (const c of f.corners) {
      const d = Math.hypot(x - c.x, y - c.y)
      if (d <= grab) return { kind: 'scale', corner: c }
      // Rotate: near the corner but outside the piece
      const pt = toArt(x, y), lp = { lx: 0, ly: 0 }
      const a = (-p.rot * Math.PI) / 180, dx = pt.x - p.x, dy = pt.y - p.y
      lp.lx = dx * Math.cos(a) - dy * Math.sin(a); lp.ly = dx * Math.sin(a) + dy * Math.cos(a)
      const inside = Math.abs(lp.lx) <= p.w / 2 && Math.abs(lp.ly) <= p.h / 2
      if (!inside && d <= ROTATE_RING + (touch ? 8 : 0)) return { kind: 'rotate', corner: c }
    }
    return null
  }
  const resizeCursor = (p: Piece, c: Corner) => {
    const deg = (Math.atan2(c.y - (ab.y + p.y * unit), c.x - (ab.x + p.x * unit)) * 180) / Math.PI
    return (deg + 360) % 180 < 90 ? 'nwse-resize' : 'nesw-resize'
  }

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    moved.current = false
    const sel = scene.pieces.find(q => q.id === selected)
    // Two fingers on a selected piece: pinch to scale, twist to rotate
    if (pointers.current.size === 2 && sel) {
      const [a, b] = [...pointers.current.values()]
      gesture.current = { mode: 'pinch', id: sel.id, d0: Math.hypot(b.x - a.x, b.y - a.y), a0: Math.atan2(b.y - a.y, b.x - a.x), w0: sel.w, h0: sel.h, r0: sel.rot }
      return
    }
    if (sel) {
      const z = zone(sel, e.clientX, e.clientY, e.pointerType === 'touch')
      if (z?.kind === 'scale') {
        // Scale from the opposite corner (Alt: from the centre), keeping the piece's proportions
        const f = frame(sel), opp = f.corners.find(c => c.sx === -z.corner.sx && c.sy === -z.corner.sy)!
        const anchor = e.altKey ? { x: f.cx, y: f.cy } : opp
        gesture.current = { mode: 'scale', id: sel.id, corner: z.corner, ax: anchor.x, ay: anchor.y, d0: Math.hypot(z.corner.x - anchor.x, z.corner.y - anchor.y), w0: sel.w, h0: sel.h, x0: sel.x, y0: sel.y }
        return
      }
      if (z?.kind === 'rotate') {
        const f = frame(sel)
        gesture.current = { mode: 'rotate', id: sel.id, a0: Math.atan2(e.clientY - f.cy, e.clientX - f.cx), r0: sel.rot }
        return
      }
    }
    const pt = toArt(e.clientX, e.clientY)
    const hit = [...scene.pieces].reverse().find(q => hitPiece(q, pt.x, pt.y, e.pointerType === 'touch' ? 0.01 : 0))
    if (!hit) { onSelect(null); gesture.current = null; return }
    onSelect(hit.id)
    gesture.current = { mode: 'move', id: hit.id, sx: pt.x, sy: pt.y, px: hit.x, py: hit.y }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) {
      // Hovering: the cursor says what a press would do
      const c = canvas.current
      if (!c || e.pointerType === 'touch') return
      const sel = scene.pieces.find(q => q.id === selected)
      const z = sel && zone(sel, e.clientX, e.clientY, false)
      if (z) {
        // The arc faces the corner: top-left is 0°, then a quarter turn per corner, plus the piece's own rotation
        const turn = z.corner.sx < 0 ? (z.corner.sy < 0 ? 0 : 270) : z.corner.sy < 0 ? 90 : 180
        c.style.cursor = z.kind === 'rotate' ? rotateCursor(turn + sel!.rot) : resizeCursor(sel!, z.corner)
        return
      }
      const pt = toArt(e.clientX, e.clientY)
      c.style.cursor = scene.pieces.some(q => hitPiece(q, pt.x, pt.y)) ? 'move' : 'default'
      return
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const gs = gesture.current
    if (!gs) return
    moved.current = true
    const p = scene.pieces.find(q => q.id === gs.id)
    if (!p) return
    if (gs.mode === 'move') {
      const pt = toArt(e.clientX, e.clientY)
      onChange(gs.id, { x: gs.px + pt.x - gs.sx, y: gs.py + pt.y - gs.sy })
    } else if (gs.mode === 'scale') {
      // Project the pointer onto the line through the anchor and the corner, so scaling stays uniform
      const vx = gs.corner.x - gs.ax, vy = gs.corner.y - gs.ay
      const k = Math.max(0.03, ((e.clientX - gs.ax) * vx + (e.clientY - gs.ay) * vy) / (gs.d0 * gs.d0))
      // The anchor stays put: the centre moves along the same line
      const cx = gs.ax + (((gs.x0 * unit + ab.x) - gs.ax) * k), cy = gs.ay + (((gs.y0 * unit + ab.y) - gs.ay) * k)
      onChange(gs.id, { w: gs.w0 * k, h: gs.h0 * k, x: (cx - ab.x) / unit, y: (cy - ab.y) / unit })
    } else if (gs.mode === 'rotate') {
      const f = frame(p), a = Math.atan2(e.clientY - f.cy, e.clientX - f.cx)
      let rot = gs.r0 + ((a - gs.a0) * 180) / Math.PI
      if (!e.shiftKey) for (const snap of [-90, 0, 90, 180]) if (Math.abs(rot - snap) < 2.5) rot = snap // settle on square
      onChange(gs.id, { rot })
    } else if (gs.mode === 'pinch' && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const k = Math.max(0.05, Math.hypot(b.x - a.x, b.y - a.y) / gs.d0)
      onChange(gs.id, { w: gs.w0 * k, h: gs.h0 * k, rot: gs.r0 + ((Math.atan2(b.y - a.y, b.x - a.x) - gs.a0) * 180) / Math.PI })
    }
  }

  const end = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size === 0) {
      if (gesture.current && moved.current) onCommit()
      gesture.current = null
    }
  }

  // Scroll: scale the selected piece; with shift, rotate it
  const wheelTimer = useRef(0)
  const onWheel = (e: React.WheelEvent) => {
    const p = scene.pieces.find(q => q.id === selected)
    if (!p) return
    if (e.shiftKey) onChange(p.id, { rot: p.rot + e.deltaY * 0.15 })
    else { const k = Math.exp(-e.deltaY * 0.0015); onChange(p.id, { w: Math.max(0.01, p.w * k), h: Math.max(0.01, p.h * k) }) }
    clearTimeout(wheelTimer.current)
    wheelTimer.current = window.setTimeout(onCommit, 300)
  }

  return (
    <canvas
      ref={canvas}
      aria-label="Collage canvas"
      className="fixed inset-0 size-full touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onWheel={onWheel}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault()
        const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'))
        if (files.length) onDropFiles(files, toArt(e.clientX, e.clientY))
      }}
    />
  )
}
