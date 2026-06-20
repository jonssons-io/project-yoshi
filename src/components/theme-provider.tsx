import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'

type ThemeProviderProps = {
  children: ReactNode
}

/**
 * Persists light/dark preference in localStorage (`yoshi-ui-theme`) and sets `class="dark"` on the document root.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="yoshi-ui-theme"
    >
      {children}
    </NextThemesProvider>
  )
}
