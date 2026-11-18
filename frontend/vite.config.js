import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server forwards /api and /pay to Django, so the browser only ever
// talks to http://localhost:5173 (no CORS headaches while developing).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/pay': 'http://127.0.0.1:8000',
    },
  },
})
