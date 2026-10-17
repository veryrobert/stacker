import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToolButton } from './ToolButton'
import { PANEL_W, SAFE_BOTTOM } from './layout'

type Panel<T extends string> = { id: T; label: string; icon: LucideIcon }

// The panel buttons: a column top right on desktop (moving aside for the open panel),
// a pill along the bottom on phones, where thumbs reach.
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
      className={cn(
        'panel fixed z-60 flex gap-1 rounded-full p-1',
        phone ? 'left-1/2 -translate-x-1/2 flex-row' : 'top-3 flex-col transition-[right] duration-200',
      )}
      style={phone ? { bottom: `calc(${SAFE_BOTTOM} + 12px)` } : { right: open ? PANEL_W + 12 : 12 }}
    >
      {panels.map(p => (
        <ToolButton key={p.id} icon={p.icon} label={p.label} side={phone ? 'top' : 'left'} active={open === p.id} onClick={() => onToggle(p.id)} />
      ))}
    </nav>
  )
}
