import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  accentColor: string
  setAccentColor: (color: string) => void
  defaultMemberId: string
  setDefaultMemberId: (id: string) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  accentColor: 'green',
  setAccentColor: () => {},
  defaultMemberId: '',
  setDefaultMemberId: () => {},
})

const accentColors: Record<string, { light: string; dark: string }> = {
  green: { light: '142.1 76.2% 36.3%', dark: '142.1 70.6% 45.3%' },
  blue: { light: '221.2 83.2% 53.3%', dark: '217.2 91.2% 59.8%' },
  purple: { light: '262.1 83.3% 57.8%', dark: '263.4 70% 50.4%' },
  orange: { light: '24.6 95% 53.1%', dark: '20.5 90.2% 48.2%' },
  red: { light: '0 72.2% 50.6%', dark: '0 72.2% 50.6%' },
  pink: { light: '346.8 77.2% 49.8%', dark: '346.8 77.2% 49.8%' },
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'dark'
  })
  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('accentColor') || 'green'
  })
  const [defaultMemberId, setDefaultMemberIdState] = useState(() => {
    return localStorage.getItem('defaultMemberId') || ''
  })

  const setDefaultMemberId = (id: string) => {
    localStorage.setItem('defaultMemberId', id)
    setDefaultMemberIdState(id)
  }

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('accentColor', accentColor)
    const root = document.documentElement
    const colors = accentColors[accentColor] || accentColors.green
    const colorValue = theme === 'dark' ? colors.dark : colors.light
    root.style.setProperty('--primary', colorValue)
    root.style.setProperty('--ring', colorValue)
  }, [accentColor, theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accentColor, setAccentColor, defaultMemberId, setDefaultMemberId }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
