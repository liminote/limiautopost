import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(
      (() => {
        try {
          const hash = execSync('git rev-parse --short HEAD').toString().trim()
          const ts = new Date().toISOString().slice(0,16).replace('T',' ')
          return `${hash} · ${ts}`
        } catch { return '' }
      })()
    ),
  },
  server: {
    host: '127.0.0.1',
    port: 4182,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4182,
    strictPort: true,
  },
})
