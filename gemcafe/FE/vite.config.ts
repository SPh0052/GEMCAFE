import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  base: process.env.VITE_BASE || '/dev/gemcafe/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fabicon.png', 'logo.png', 'logo_text.png'],
      manifest: {
        name: 'gem.cafe',
        short_name: 'gem.cafe',
        description: 'AI 레시피 영상 생성 서비스',
        theme_color: '#ff4a0d',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'ko',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      // dev 모드에선 PWA 비활성 — service worker 와 HMR 캐시 충돌, 재시작 시
      // dev-dist/sw.js, workbox-*.js 의 race condition 으로 인한 ENOENT 회피.
      // PWA 동작 검증은 `npm run build && npm run preview` 로 운영 빌드에서 확인.
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // 개발 시 CORS 회피: 브라우저에서는 same-origin 으로 보이게 하고
    // Vite 가 그대로 BE 로 포워딩. 운영에서는 FE/BE 같은 도메인이라 프록시 불필요.
    proxy: {
      '/dev/be': {
        target: 'https://k14s307.p.ssafy.io',
        changeOrigin: true,
        secure: true,
        // BE 의 Origin 화이트리스트가 운영 도메인만 허용하므로
        // forwarding 시 Origin/Referer 를 운영값으로 위장.
        headers: {
          origin: 'https://k14s307.p.ssafy.io',
          referer: 'https://k14s307.p.ssafy.io/',
        },
      },
      // 파일 서빙 — /dev/files/gemcafe/{filename} 형식 (영상/썸네일/이미지)
      '/dev/files': {
        target: 'https://k14s307.p.ssafy.io',
        changeOrigin: true,
        secure: true,
        headers: {
          origin: 'https://k14s307.p.ssafy.io',
          referer: 'https://k14s307.p.ssafy.io/',
        },
      },
    },
  },
})
