import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'

const config = defineConfig({
  optimizeDeps: {
    // TanStack Start excludes packages built on it (here Clerk's integration)
    // from dev pre-bundling, so their imports are served as they are. These
    // pull in CommonJS code (swr -> use-sync-external-store) that the browser
    // cannot load unless Vite is told to pre-bundle them.
    include: [
      '@clerk/tanstack-react-start > @clerk/clerk-react/internal',
      '@clerk/tanstack-react-start > @clerk/shared/error',
      '@clerk/tanstack-react-start > @clerk/shared/getEnvVariable',
      '@clerk/tanstack-react-start > @clerk/shared/underscore'
    ]
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  plugins: [
    devtools(),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: [
        './tsconfig.json'
      ]
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact({
      babel: {
        plugins: [
          'babel-plugin-react-compiler'
        ]
      }
    })
  ]
})

export default config
