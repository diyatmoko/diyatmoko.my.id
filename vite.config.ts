import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE_PATH || '/'
  if (!base.startsWith('/') || !base.endsWith('/')) {
    throw new Error('VITE_BASE_PATH must start and end with a slash.')
  }
  const siteUrl = new URL(env.VITE_SITE_URL || 'https://diyatmoko.my.id')
  if (!['http:', 'https:'].includes(siteUrl.protocol)) {
    throw new Error('VITE_SITE_URL must be an HTTP(S) URL.')
  }
  return {
    base,
    plugins: [react()],
    ssr: { noExternal: ['gsap', '@gsap/react', 'lucide-react'] },
    build: { target: 'es2022', sourcemap: false, assetsInlineLimit: 0 },
    server: { host: '0.0.0.0' },
    preview: { host: '0.0.0.0', port: 4173, strictPort: true },
  }
})
