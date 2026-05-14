import { UtensilsCrossed } from 'lucide-react'

/**
 * 전체 사이트 공통 푸터 (검은 톤).
 * Intro / Login / 메인 앱 모두 공유.
 */
export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-gray-950 py-10 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 sm:flex-row sm:px-10">
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="gem.cafe 로고"
            className="h-9 w-9"
          />
          <div>
            <div className="flex items-center gap-2">
              <img
                src={`${import.meta.env.BASE_URL}logo_text.png`}
                alt="gem.cafe"
                className="h-5 brightness-0 invert"
              />
            </div>
            <p className="mt-1 text-xs text-white/50">
              AI 카페 영상 자동 생성 서비스
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-5 text-xs font-medium text-white/70">
          <a href="#" className="transition hover:text-white">
            이용약관
          </a>
          <span className="h-3 w-px bg-white/15" />
          <a href="#" className="transition hover:text-white">
            개인정보처리방침
          </a>
          <span className="h-3 w-px bg-white/15" />
          <a href="#" className="transition hover:text-white">
            문의
          </a>
        </nav>

        <div className="flex items-center gap-1.5 text-[11px] text-white/40">
          <UtensilsCrossed className="h-3.5 w-3.5" />
          <span>© 2026 gem.cafe</span>
        </div>
      </div>
    </footer>
  )
}
