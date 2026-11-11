import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: true,
    },
    define: {
      'process.env': {},
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    }
  }
})
