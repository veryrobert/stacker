import { useRef } from 'react'
import { Upload, X } from 'lucide-react'

// Pick one file; shows its name, with a button to clear it.
export function FilePick({
  name,
  accept,
  onPick,
  onClear,
  label,
}: {
  name: string | null
  accept: string
  onPick: (file: File) => void
  onClear: () => void
  label: string
}) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className="flex h-8 items-center gap-0.5 rounded-[10px] bg-muted p-0.5">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex h-7 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs hover:bg-accent"
      >
        {!name && <Upload className="size-3.5 shrink-0" strokeWidth={1.5} />}
        <span className="truncate">{name ?? 'Load'}</span>
      </button>
      {name && (
        <button type="button" aria-label={`Remove ${label.toLowerCase()}`} onClick={onClear} className="grid size-7 place-items-center rounded-lg hover:bg-accent">
          <X className="size-3.5" strokeWidth={1.5} />
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        aria-label={label}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
