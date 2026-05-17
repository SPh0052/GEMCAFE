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
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['fabicon.png', 'logo.png', 'logo_text.png'],
      manifest: {
        name: 'gem.cafe',
        short_name: 'gem.cafe',
        description: 'AI 레시피 영상 생성 서비스',
        theme_color: '#ff4a0d',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        // 같은 도메인 (k14s307.p.ssafy.io) 에 /dev/gemmark 도 함께 서빙되므로
        // scope 를 '/' 로 두면 gemcafe SW 가 gemmark navigation 까지 가로채서
        // 빈 화면 / 캐시된 gemcafe index 가 응답되는 버그가 발생한다.
        start_url: '/dev/gemcafe/',
        scope: '/dev/gemcafe/',
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
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // 데모용 mock 자산 (크기가 큼) 은 precache 에서 제외 — 오프라인 지원 불필요 + 캐시 한도 초과 회피.
        globIgnores: ['**/mock/**'],
        // precache 단일 파일 크기 한도 — 큰 mp3/mp4 가 있어도 빌드 실패 안 하게 여유 줌
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
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
        // BE 가 응답에 박는 refreshToken 쿠키를 localhost 환경에서도 브라우저가 받아들이게
        // Domain / Path / Secure / SameSite 를 dev 친화적으로 rewrite.
        // 운영 빌드엔 proxy 자체가 없어 영향 없음 (FE/BE 같은 도메인이라 자연스럽게 작동).
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: '/',
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            const sc = proxyRes.headers['set-cookie']
            if (!sc) return
            const list = Array.isArray(sc) ? sc : [sc]
            proxyRes.headers['set-cookie'] = list.map((c) =>
              c
                // http://localhost 는 secure context 아닐 수 있어 Secure 플래그 제거
                .replace(/;\s*Secure/gi, '')
                // SameSite=Strict 은 dev 환경 cross-origin 우회 시 차단되니 Lax 로 완화
                .replace(/;\s*SameSite=Strict/gi, '; SameSite=Lax'),
            )
          })
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
