import { cn } from '@/lib/utils'

// Round colour swatches plus a custom colour picker as the last swatch.
export function Swatches({
  value,
  onChange,
  colours,
  label,
}: {
  value: string
  onChange: (colour: string) => void
  colours: readonly (readonly [string, string])[]
  label: string
}) {
  const custom = !colours.some(([c]) => c === value)
  const ring = 'outline-2 outline-offset-2 outline-foreground'
  return (
    <div role="group" aria-label={label} className="grid grid-cols-8 gap-2">
      {colours.map(([c, name]) => (
        <button
          key={c}
          type="button"
          aria-label={name}
          aria-pressed={c === value}
          onClick={() => onChange(c)}
          className={cn('aspect-square rounded-full border border-border focus-visible:outline-2 focus-visible:outline-ring', c === value && ring)}
          style={{ background: c }}
        />
      ))}
      <label
        className={cn('relative aspect-square cursor-pointer rounded-full border border-border', custom && ring)}
        style={{ background: custom ? value : 'conic-gradient(#f66, #fd5, #6e8, #5bf, #b7f, #f66)' }}
      >
        <span className="sr-only">Custom colour</span>
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
      </label>
    </div>
  )
}
