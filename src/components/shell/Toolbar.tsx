import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// Frosted pill that floats over the stage (just the icons on phones). Use for the few primary actions.
export function Toolbar({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      role="toolbar"
      className={cn('panel flex items-center gap-0.5 rounded-full p-1 max-sm:border-transparent max-sm:bg-transparent max-sm:backdrop-filter-none', className)}
      {...props}
    />
  )
}

export function ToolbarSeparator() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-border" />
}
