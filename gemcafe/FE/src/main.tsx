import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import '@/index.css'

// Vite 의 base 설정(vite.config.ts 의 base) 에 따라 자동으로 결정되는 값.
// dev / build 모두 동일하게 동작하며 별도 환경변수 셋업이 필요 없음.
const basename = import.meta.env.BASE_URL || '/dev/gemcafe/'

// 과거 빌드에서 scope: '/' 로 잘못 등록된 SW 가 같은 도메인의 /dev/gemmark
// navigation 까지 가로채는 버그가 있어, 한 번 청소한다.
// 올바른 scope (/dev/gemcafe/) 의 SW 는 vite-plugin-pwa 가 자동 재등록한다.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) {
      if (!reg.scope.endsWith('/dev/gemcafe/')) {
        reg.unregister()
      }
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
