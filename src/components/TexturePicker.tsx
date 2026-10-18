import { useEffect, useRef } from 'react'
import { Ban, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TextureSource } from '@/textures'

// A row of texture swatches: none, the built-ins, your own, and a tile to load another
export function TexturePicker({
  textures,
  value,
  onChange,
  onLoad,
  onRemove,
  allowNone = true,
}: {
  textures: TextureSource[]
  value: string | null
  onChange: (id: string | null) => void
  onLoad: (file: File) => void
  onRemove?: (id: string) => void
  allowNone?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const tile = 'relative aspect-square overflow-hidden rounded-md ring-1 ring-border outline-none focus-visible:ring-2 focus-visible:ring-ring'
  return (
    <div role="group" aria-label="Texture" className="grid grid-cols-5 gap-1.5">
      {allowNone && (
        <button type="button" aria-label="No texture" aria-pressed={value === null} onClick={() => onChange(null)}
          className={cn(tile, 'grid place-items-center bg-muted text-muted-foreground', value === null && 'ring-2 ring-foreground')}>
          <Ban className="size-4" strokeWidth={1.5} />
        </button>
      )}
      {textures.map(t => (
        <div key={t.id} className="group relative">
          <button type="button" aria-label={t.name} title={t.name} aria-pressed={value === t.id} onClick={() => onChange(t.id)}
            className={cn(tile, 'block w-full', value === t.id && 'ring-2 ring-foreground')}>
            <Thumb src={t.base} />
          </button>
          {t.user && onRemove && (
            <button type="button" aria-label={`Remove ${t.name}`} onClick={() => onRemove(t.id)}
              className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-background text-foreground opacity-0 ring-1 ring-border transition-opacity group-hover:opacity-100 focus-visible:opacity-100">
              <X className="size-2.5" strokeWidth={2} />
            </button>
          )}
        </div>
      ))}
      <button type="button" aria-label="Load a texture" title="Load a texture" onClick={() => input.current?.click()}
        className={cn(tile, 'grid place-items-center bg-muted text-muted-foreground hover:text-foreground')}>
        <Plus className="size-4" strokeWidth={1.5} />
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onLoad(f); e.target.value = '' }} />
    </div>
  )
}

// A small crop of the texture at its natural size, so its grain shows
function Thumb({ src }: { src: HTMLCanvasElement }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.width = c.height = 96
    const g = c.getContext('2d')!
    const s = Math.min(src.width, src.height, 240)
    g.drawImage(src, 0, 0, s, s, 0, 0, 96, 96)
  }, [src])
  return <canvas ref={ref} className="size-full" aria-hidden />
}
