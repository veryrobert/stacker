import type { Cut } from '@/scene'
import { cn } from '@/lib/utils'

// The piece shapes as icons, drawn like Lucide's (24 grid, 1.5 stroke, round joins)
const D: Record<Cut, string> = {
  none: 'M5 5h14v14H5z',
  circle: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z',
  half: 'M4 16a8 8 0 0 1 16 0z',
  quarter: 'M5 19V5a14 14 0 0 1 14 14z',
  triangle: 'M12 5l8 14H4z',
  arch: 'M6 20V11a6 6 0 0 1 12 0v9z',
  diamond: 'M12 3l7 9-7 9-7-9z',
  pill: 'M8 8h8a4 4 0 0 1 0 8H8a4 4 0 0 1 0-8z',
}

export function CutIcon({ cut, className }: { cut: Cut; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" className={cn('size-5', className)} aria-hidden>
      <path d={D[cut]} />
    </svg>
  )
}

// Pick a shape: a row of round buttons like the toolbar's (40px circles, 20px icons), the chosen one
// filled as an active toolbar button is; in the toolbar's own pill
export function CutPicker({ value, onChange, options }: { value: Cut; onChange: (c: Cut) => void; options: { value: Cut; label: string }[] }) {
  return (
    <div role="radiogroup" aria-label="Shape" className="panel mx-auto flex w-fit max-w-full flex-wrap justify-center gap-0.5 rounded-full p-1 max-sm:border-transparent max-sm:bg-transparent max-sm:backdrop-filter-none">
      {options.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} aria-label={o.label} title={o.label} onClick={() => onChange(o.value)}
          className={cn('grid size-10 place-items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', o.value === value ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent')}>
          <CutIcon cut={o.value} />
        </button>
      ))}
    </div>
  )
}
