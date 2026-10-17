import type { ReactNode } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PANEL_W, PHONE_SHEET, SAFE_BOTTOM } from './layout'

// A non-modal panel (closes when you click off it): from the right on desktop, up from the bottom on phones. On phones the
// panel rail floats over its lower edge, so the content keeps clear of it.
export function PanelSheet({
  open,
  title,
  onClose,
  phone,
  children,
}: {
  open: boolean
  title?: string
  onClose: () => void
  phone: boolean
  children: ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()} modal={false}>
      <SheetContent
        side={phone ? 'bottom' : 'right'}
        className="panel gap-0 data-[side=bottom]:rounded-t-2xl data-[side=bottom]:border-x-0 data-[side=right]:sm:max-w-none"
        style={phone ? { height: `${PHONE_SHEET * 100}dvh` } : { width: `min(${PANEL_W}px, 86vw)` }}
        // Clicking off the panel closes it, except on the panel buttons (they switch panels) and in
        // anything opened from the panel, like a dialog, menu or tooltip
        onInteractOutside={e => {
          const t = e.target as Element | null
          if (t?.closest('[aria-label="Panels"], [role="dialog"], [role="menu"], [data-radix-popper-content-wrapper]')) e.preventDefault()
        }}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="sr-only">{title} options</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 overflow-y-auto px-4" style={{ paddingBottom: phone ? `calc(${SAFE_BOTTOM} + 80px)` : 24 }}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}
