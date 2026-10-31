import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['mark.svg'],
    manifest: {
      name: 'The Village - Werewolf companion',
      short_name: 'The Village',
      description: 'An offline companion for in-person Werewolf games.',
      theme_color: '#090909',
      background_color: '#090909',
      display: 'standalone',
      start_url: '/',
      icons: [{ src: '/mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
    },
  })],
})
