import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In development the React app runs on :5173 and the FastAPI server on :8000.
// The proxy forwards every /api request (including the /api/ws WebSocket) to
// FastAPI, so the frontend can use plain relative URLs like fetch('/api/...').
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8000', ws: true },
    },
  },
})
