import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// Frosted pill that floats over the stage. Use for the few primary actions.
export function Toolbar({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      role="toolbar"
      className={cn('panel flex items-center gap-0.5 rounded-full p-1', className)}
      {...props}
    />
  )
}

export function ToolbarSeparator() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-border" />
}
