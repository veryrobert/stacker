import type { LucideIcon } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

// Single-choice control. Selected option is inverted, as in Card studio.
// Give an option an icon to show it instead of the label (the label stays as its name).
export type SegmentedOption<T extends string> = { value: T; label: string; icon?: LucideIcon; disabled?: boolean }

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'sm',
}: {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  label: string
  size?: 'sm' | 'lg' // lg matches the toolbar (40px), for controls that sit with it
}) {
  return (
    <ToggleGroup
      type="single"
      aria-label={label}
      value={value}
      onValueChange={v => v && onChange(v as T)}
      spacing={0}
      className={cn('grid w-full auto-cols-fr grid-flow-col bg-muted p-0.5', size === 'lg' ? 'rounded-full' : 'rounded-[10px]')}
    >
      {options.map(({ value: v, label: l, icon: Icon, disabled }) => (
        <ToggleGroupItem
          key={v}
          value={v}
          disabled={disabled}
          aria-label={Icon ? l : undefined}
          title={Icon ? l : undefined}
          className={cn('min-w-0 px-1 text-xs font-normal data-[state=on]:bg-primary data-[state=on]:text-primary-foreground disabled:opacity-30', size === 'lg' ? 'h-10 rounded-full' : 'h-7 rounded-lg')}
        >
          {Icon ? <Icon className="size-3.5" strokeWidth={1.5} /> : <span className="truncate">{l}</span>}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

// On/off as a two-option Segmented.
export function OnOff({ value, onChange, label, on = 'On', off = 'Off' }: { value: boolean; onChange: (v: boolean) => void; label: string; on?: string; off?: string }) {
  return (
    <Segmented
      label={label}
      value={value ? '1' : '0'}
      onChange={v => onChange(v === '1')}
      options={[{ value: '1', label: on }, { value: '0', label: off }]}
    />
  )
}
