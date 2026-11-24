import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// Tests only need path aliases and JSX. The app's Vite config also loads the
// TanStack Start, Nitro, and devtools plugins; with those, component tests get
// a second copy of React ("Invalid hook call"). Component tests opt into a DOM
// per file with `// @vitest-environment jsdom`.
export default defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: [
        './tsconfig.json'
      ]
    }),
    viteReact()
  ]
})
