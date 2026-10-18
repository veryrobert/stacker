import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToolButton } from './ToolButton'
import { PANEL_W } from './layout'

type Panel<T extends string> = { id: T; label: string; icon: LucideIcon }

// The panel buttons, top right: a column on desktop (moving aside for the open panel), a row on
// phones (clear of the notch, just the icons), so the bottom is left to the actions.
export function PanelRail<T extends string>({
  panels,
  open,
  onToggle,
  phone,
}: {
  panels: readonly Panel<T>[]
  open: T | null
  onToggle: (id: T) => void
  phone: boolean
}) {
  return (
    <nav
      aria-label="Panels"
      className={cn('panel fixed z-60 flex gap-1 rounded-full p-1', phone ? 'flex-row max-sm:border-transparent max-sm:bg-transparent max-sm:backdrop-filter-none' : 'flex-col transition-[right] duration-200')}
      style={phone ? { top: 'calc(env(safe-area-inset-top, 0px) + 12px)', right: 12 } : { top: 12, right: open ? PANEL_W + 12 : 12 }}
    >
      {panels.map(p => (
        <ToolButton key={p.id} icon={p.icon} label={p.label} side={phone ? 'bottom' : 'left'} active={open === p.id} onClick={() => onToggle(p.id)} />
      ))}
    </nav>
  )
}
