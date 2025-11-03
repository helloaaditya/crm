import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-service-worker',
      closeBundle() {
        try {
          copyFileSync(
            resolve(__dirname, 'public/service-worker.js'),
            resolve(__dirname, 'dist/service-worker.js')
          )
          console.log('✓ Service worker copied to dist/')
        } catch (err) {
          console.error('Failed to copy service worker:', err)
        }
      }
    }
  ],
  base: '/',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
