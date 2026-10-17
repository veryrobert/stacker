import { useEffect, useState } from 'react'

// Shared layout numbers for the app shell
export const PANEL_W = 300 // side panel width on desktop
export const PHONE_SHEET = 0.55 // bottom panel height on phones, as a fraction of the screen
export const PHONE_QUERY = '(max-width: 639px)'
// Bottom of the screen, clear of the iPhone home indicator and Safari's bar
export const SAFE_BOTTOM = 'env(safe-area-inset-bottom, 0px)'

export function usePhone() {
  const [phone, setPhone] = useState(() => matchMedia(PHONE_QUERY).matches)
  useEffect(() => {
    const m = matchMedia(PHONE_QUERY)
    const on = () => setPhone(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return phone
}
