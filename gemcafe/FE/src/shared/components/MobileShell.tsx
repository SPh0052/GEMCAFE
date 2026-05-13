import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

// 모바일 우선 PWA 컨테이너 — 화면 크기에 따라 max-width 가 유연하게 확장
//  · ~ 640px (모바일):  430px 폭 (앱 고유 폭, 풀 스크린 느낌)
//  · 640~1024px (태블릿): 600px 폭, 살짝 여백 + 카드 그림자
//  · 1024px+ (데스크톱): 720px 폭, 더 넓은 카드 형태 PWA UI
export default function MobileShell({ children, className = '' }: Props) {
  return (
    <div className="flex min-h-screen justify-center bg-white">
      <div
        className={`relative flex min-h-screen w-full max-w-107.5 flex-col bg-white shadow-none sm:max-w-150 md:max-w-180 lg:max-w-200 ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
