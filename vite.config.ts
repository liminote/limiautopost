import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(
      (() => {
        // 優先使用部署平台提供的 commit 變數（Netlify: COMMIT_REF）
        const hash = (process.env.VITE_GIT_SHA || process.env.COMMIT_REF || '').toString().slice(0, 7)
        const ts = new Date().toISOString().slice(0, 16).replace('T', ' ')
        return hash ? `${hash} · ${ts}` : ts
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
