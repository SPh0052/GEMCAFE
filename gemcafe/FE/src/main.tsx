import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import '@/index.css'

// Vite 의 base 설정(vite.config.ts 의 base) 에 따라 자동으로 결정되는 값.
// dev / build 모두 동일하게 동작하며 별도 환경변수 셋업이 필요 없음.
const basename = import.meta.env.BASE_URL || '/dev/gemcafe/'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
