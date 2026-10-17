import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PANEL_W, SAFE_BOTTOM } from './layout'

// Holds the actions Toolbar: bottom centre on desktop (centred in the space beside an open panel),
// just above the panel rail on phones, and out of the way while a phone panel is open.
export function ActionDock({ phone, panelOpen, children }: { phone: boolean; panelOpen: boolean; children: ReactNode }) {
  if (phone && panelOpen) return null
  return (
    <div
      className={cn('pointer-events-none fixed inset-x-0 flex flex-col items-center gap-2 transition-[right] duration-200 [&>*]:pointer-events-auto')}
      style={phone ? { bottom: `calc(${SAFE_BOTTOM} + 72px)` } : { bottom: 16, right: panelOpen ? PANEL_W : 0 }}
    >
      {children}
    </div>
  )
}
