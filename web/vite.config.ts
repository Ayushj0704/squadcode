import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  assetsInclude: ['**/*.glb'],
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // ⚠️ AUTH DISABLED FOR TESTING — swap Clerk with a mock shim
      '@clerk/clerk-react': `${import.meta.dirname}/src/lib/mockClerk.tsx`,
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: ["recharts"]
  }
})
