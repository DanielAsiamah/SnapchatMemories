import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/src-tauri/**']
    },
    proxy: {
      '/snapchat-proxy': {
        target: 'https://app.snapchat.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/snapchat-proxy/, '')
      }
    }
  }
})
