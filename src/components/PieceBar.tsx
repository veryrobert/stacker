import type { ComponentType, ReactNode } from 'react'
import { ArrowUpDown, BringToFront, Contrast, CopyPlus, Droplet, Palette, Plus, Scissors, SendToBack, Shapes, Stamp, Sun, Trash2, Waves } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Segmented } from '@/components/shell/Segmented'
import { Swatches } from '@/components/shell/Swatches'
import { CutPicker } from '@/components/CutIcon'
import { TexturePicker } from '@/components/TexturePicker'
import { CUTS, SWATCHES, type Piece } from '@/scene'
import { BLENDS, type Blend, type TextureSource } from '@/textures'
import { cn } from '@/lib/utils'

// Editing one piece, as in Instagram and CapCut: tapping a piece swaps the bottom bar for that piece's
// tools; tapping a tool opens one row of options above the bar and lights the tool (tap it again to
// close it); Done (top right) or tapping the empty board steps out of the piece. Moving,
// resizing and turning stay on the canvas.

export type PieceTool = 'shape' | 'edge' | 'colour' | 'texture' | 'adjust' | 'fade' | 'print' | 'mark' | 'order'

type Props = {
  piece: Piece
  tool: PieceTool | null
  onTool: (t: PieceTool | null) => void
  update: (p: Partial<Piece>) => void
  commit: () => void
  textures: TextureSource[]
  onLoadTexture: (f: File) => Promise<string | null>
  onRemoveTexture: (id: string) => void
  onReorder: (to: 'front' | 'back') => void
  onDuplicate: () => void
  onDelete: () => void
}

const TOOLS: { id: PieceTool; label: string; icon: ComponentType<{ className?: string; strokeWidth?: number }>; for: Piece['kind'][] }[] = [
  { id: 'shape', label: 'Shape', icon: Shapes, for: ['image', 'block'] },
  { id: 'edge', label: 'Edge', icon: Scissors, for: ['image', 'block'] },
  { id: 'colour', label: 'Colour', icon: Palette, for: ['block', 'circle', 'grid', 'cross'] },
  { id: 'texture', label: 'Texture', icon: Waves, for: ['image', 'block', 'circle'] },
  { id: 'adjust', label: 'Adjust', icon: Sun, for: ['image'] },
  { id: 'fade', label: 'Fade', icon: Droplet, for: ['image', 'block', 'circle', 'grid', 'cross'] },
  { id: 'print', label: 'Print', icon: Stamp, for: ['image', 'block', 'circle'] },
  { id: 'mark', label: 'Mark', icon: Plus, for: ['cross'] },
  { id: 'order', label: 'Order', icon: ArrowUpDown, for: ['image', 'block', 'circle', 'grid', 'cross'] },
]

const TEX_DEFAULT = { blend: 'multiply' as Blend, amount: 0.5, scale: 1, colour: 'neutral' as const }

export function PieceBar(p: Props) {
  const { piece, tool, onTool, update, commit } = p
  const tools = TOOLS.filter(t => t.for.includes(piece.kind))
  return (
    <div className="flex w-[min(440px,calc(100vw-24px))] flex-col items-stretch gap-2">
      {tool && <div className="panel rounded-2xl px-3 py-2.5">{options(p)}</div>}
      <div role="toolbar" aria-label="Piece" className="panel flex items-center gap-0.5 overflow-x-auto rounded-2xl p-1 [scrollbar-width:none] max-sm:border-transparent max-sm:bg-transparent max-sm:backdrop-filter-none">
        {piece.kind === 'image' && (
          <BarButton label="B&W" pressed={piece.mono} onClick={() => { update({ mono: !piece.mono }); commit() }}>
            <Contrast className="size-5" strokeWidth={1.5} />
          </BarButton>
        )}
        {tools.map(t => (
          // The open tool stays lit; tap it again to close it, or another to switch
          <BarButton key={t.id} label={t.label} pressed={tool === t.id} onClick={() => onTool(tool === t.id ? null : t.id)}><t.icon className="size-5" strokeWidth={1.5} /></BarButton>
        ))}
        <BarButton label="Duplicate" onClick={p.onDuplicate}><CopyPlus className="size-5" strokeWidth={1.5} /></BarButton>
        <BarButton label="Delete" onClick={p.onDelete}><Trash2 className="size-5" strokeWidth={1.5} /></BarButton>
      </div>
    </div>
  )
}

// A tool in the bar: icon over a short label, as in CapCut
function BarButton({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={pressed} aria-label={label}
      className={cn('flex min-w-14 shrink-0 flex-col items-center gap-1 rounded-xl px-1.5 py-1.5 text-[10px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',
        pressed ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
      {children}
      <span aria-hidden>{label}</span>
    </button>
  )
}

// One slider with its name and value, compact
function Row({ label, value, min = 0, max = 1, step = 0.01, onChange, onCommit }: { label: string; value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void; onCommit: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs">{label}</span>
      <Slider aria-label={label} min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} onValueCommit={onCommit} />
    </div>
  )
}

// The one row of options for the open tool
function options({ piece, tool, update, commit, textures, onLoadTexture, onRemoveTexture, onReorder }: Props) {
  switch (tool) {
    case 'shape':
      return <CutPicker value={piece.crop} onChange={v => { update({ crop: v }); commit() }} options={CUTS} />
    case 'edge':
      return <Segmented label="Edge" value={piece.edge} onChange={v => { update({ edge: v, ...(v === 'torn' ? { crop: 'none' } : {}) }); commit() }} options={[{ value: 'clean', label: 'Clean' }, { value: 'torn', label: 'Torn' }]} />
    case 'colour':
      return <Swatches label="Colour" value={piece.color} onChange={v => { update({ color: v }); commit() }} colours={SWATCHES} />
    case 'texture':
      return (
        <div className="flex flex-col gap-2">
          <TexturePicker row textures={textures} value={piece.tex?.source ?? null}
            onChange={id => { update({ tex: id ? { ...TEX_DEFAULT, ...piece.tex, source: id } : null }); commit() }}
            onLoad={async f => { const id = await onLoadTexture(f); if (id) { update({ tex: { ...TEX_DEFAULT, ...piece.tex, source: id } }); commit() } }}
            onRemove={onRemoveTexture} />
          {piece.tex && (
            <>
              <Segmented label="Texture blend" value={piece.tex.blend} onChange={(v: Blend) => { update({ tex: { ...piece.tex!, blend: v } }); commit() }} options={BLENDS} />
              <Row label="Amount" value={piece.tex.amount} onChange={v => update({ tex: { ...piece.tex!, amount: v } })} onCommit={commit} />
            </>
          )}
        </div>
      )
    case 'adjust':
      return (
        <div className="flex flex-col gap-2.5">
          <Row label="Saturation" value={piece.adjust.sat} max={2} onChange={v => update({ adjust: { ...piece.adjust, sat: v } })} onCommit={commit} />
          <Row label="Contrast" value={piece.adjust.con} min={0.5} max={1.5} onChange={v => update({ adjust: { ...piece.adjust, con: v } })} onCommit={commit} />
          <Row label="Brightness" value={piece.adjust.bri} min={0.5} max={1.5} onChange={v => update({ adjust: { ...piece.adjust, bri: v } })} onCommit={commit} />
        </div>
      )
    case 'fade':
      return (
        <div className="flex flex-col gap-2.5">
          <Row label="Show through" value={piece.show} onChange={v => update({ show: v })} onCommit={commit} />
          <Segmented label="Blend" value={piece.blend} onChange={v => { update({ blend: v }); commit() }} options={[{ value: 'normal', label: 'Normal' }, { value: 'multiply', label: 'Multiply' }]} />
        </div>
      )
    case 'print':
      return <Row label="Print feel" value={piece.texture} onChange={v => update({ texture: v })} onCommit={commit} />
    case 'mark':
      return <Segmented label="Mark" value={piece.cross} onChange={v => { update({ cross: v }); commit() }} options={[{ value: 'plus', label: 'Plus' }, { value: 'x', label: 'Cross' }, { value: 'reg', label: 'Register' }]} />
    case 'order':
      return (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onReorder('front')} className="flex items-center justify-center gap-2 rounded-lg bg-muted py-2 text-xs"><BringToFront className="size-4" strokeWidth={1.5} />To front</button>
          <button type="button" onClick={() => onReorder('back')} className="flex items-center justify-center gap-2 rounded-lg bg-muted py-2 text-xs"><SendToBack className="size-4" strokeWidth={1.5} />To back</button>
        </div>
      )
    default:
      return null
  }
}
