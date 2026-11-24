import { useEffect, useState } from 'react'

const storageKey = 'hidrosmart-theme'
const validPreference = value => ['light', 'dark', 'system'].includes(value) ? value : 'system'

function readPreference() {
  try { return validPreference(localStorage.getItem(storageKey)) }
  catch { return 'system' }
}

export function useTheme() {
  const [preference, setPreference] = useState(readPreference)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = preference === 'dark' || (preference === 'system' && media.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#171e18' : '#f5f3e9')
    }
    apply()
    media.addEventListener('change', apply)
    const sync = event => {
      if (event.key === storageKey || event.key === null) setPreference(readPreference())
    }
    window.addEventListener('storage', sync)
    return () => {
      media.removeEventListener('change', apply)
      window.removeEventListener('storage', sync)
    }
  }, [preference])

  const changeTheme = value => {
    const next = validPreference(value)
    try { localStorage.setItem(storageKey, next) } catch { /* Keep the choice for this session. */ }
    setPreference(next)
  }

  return [preference, changeTheme]
}
