import type { ReactNode } from 'react'

// A labelled row inside a sheet.
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-foreground">{label}</span>
      {children}
    </div>
  )
}

export function FieldGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      {title && <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>}
      {children}
    </section>
  )
}
