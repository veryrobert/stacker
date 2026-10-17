import { Children, cloneElement, isValidElement, useEffect, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react'

// Load screen, as in loom: the app's mark draws in stroke by stroke, holds, then the screen fades away.
// Children are the mark's <path pathLength={1} /> elements on a 32×32 grid, drawn in order.
const PAUSE = 350, STAGGER = 90, STROKE = 600, HOLD = 450, FADE = 500

export function Splash({ label, children }: { label: string; children: ReactNode }) {
  const paths = Children.toArray(children).filter(isValidElement) as ReactElement<{ style?: CSSProperties }>[]
  const [phase, setPhase] = useState<'draw' | 'fade' | 'gone'>('draw')

  useEffect(() => {
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
    const drawn = calm ? 400 : PAUSE + (paths.length - 1) * STAGGER + STROKE + HOLD
    const fade = setTimeout(() => setPhase('fade'), drawn)
    const gone = setTimeout(() => setPhase('gone'), drawn + FADE)
    return () => {
      clearTimeout(fade)
      clearTimeout(gone)
    }
  }, [paths.length])

  if (phase === 'gone') return null
  return (
    <div className="splash" data-fade={phase === 'fade' || undefined} role="status" aria-label={label}>
      <svg viewBox="0 0 32 32" aria-hidden>
        {paths.map((p, i) => cloneElement(p, { key: i, style: { ...p.props.style, '--i': i } as CSSProperties }))}
      </svg>
    </div>
  )
}
