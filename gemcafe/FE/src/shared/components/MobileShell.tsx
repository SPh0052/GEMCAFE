import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

// 모바일 전용 컨테이너 (PC에서도 모바일 크기로 센터 정렬)
export default function MobileShell({ children, className = '' }: Props) {
  return (
    <div className="flex min-h-screen justify-center bg-gray-100">
      <div
        className={`relative flex w-full min-h-screen max-w-[430px] flex-col bg-white ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
