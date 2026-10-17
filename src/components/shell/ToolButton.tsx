import type { LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// Icon-only button. The label is required: it's the tooltip and the
// accessible name, so icons can replace text without losing meaning.
type Props = ComponentProps<'button'> & {
  icon: LucideIcon
  label: string
  active?: boolean
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function ToolButton({ icon: Icon, label, active, side = 'left', className, ...props }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          className={cn(
            'grid size-10 place-items-center rounded-full text-foreground transition-colors outline-none',
            'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
            active && 'bg-primary text-primary-foreground hover:bg-primary',
            className,
          )}
          {...props}
        >
          <Icon className="size-5" strokeWidth={1.5} />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  )
}
