import type { LucideIcon } from 'lucide-react'
import { ToolButton } from './ToolButton'
import { PANEL_W } from './layout'

type Panel<T extends string> = { id: T; label: string; icon: LucideIcon }

// The panel buttons: a column top right, on phones too (clear of the notch), so the bottom is left
// to the actions. On desktop it moves aside for the open panel; on phones the panel opens below it.
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
      className="panel fixed z-60 flex flex-col gap-1 rounded-full p-1 transition-[right] duration-200"
      style={phone ? { top: 'calc(env(safe-area-inset-top, 0px) + 12px)', right: 12 } : { top: 12, right: open ? PANEL_W + 12 : 12 }}
    >
      {panels.map(p => (
        <ToolButton key={p.id} icon={p.icon} label={p.label} side="left" active={open === p.id} onClick={() => onToggle(p.id)} />
      ))}
    </nav>
  )
}
