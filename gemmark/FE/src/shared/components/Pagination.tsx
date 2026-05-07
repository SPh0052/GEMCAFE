import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  currentPage: number
  totalPages: number
  onChange: (page: number) => void
  /** 현재 페이지 양옆에 보여줄 페이지 수 (기본 1 — 즉 5개 정도 노출) */
  siblingCount?: number
  className?: string
}

/**
 * 페이지네이션 UI.
 * 현재 페이지 ± siblingCount, 양 끝(1, totalPages), 그 사이엔 ellipsis.
 *
 * 예) total=10, current=5, sibling=1:
 *   ‹ 1 … 4 [5] 6 … 10 ›
 */
export default function Pagination({
  currentPage,
  totalPages,
  onChange,
  siblingCount = 1,
  className = '',
}: Props) {
  if (totalPages <= 1) return null

  const pages = computePageList(currentPage, totalPages, siblingCount)
  const canPrev = currentPage > 1
  const canNext = currentPage < totalPages

  return (
    <nav
      aria-label="페이지 네비게이션"
      className={`flex items-center justify-center gap-1 ${className}`}
    >
      <button
        type="button"
        onClick={() => canPrev && onChange(currentPage - 1)}
        disabled={!canPrev}
        aria-label="이전 페이지"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span
            key={`gap-${i}`}
            className="flex h-8 w-8 items-center justify-center text-sm text-gray-400"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === currentPage ? 'page' : undefined}
            aria-label={`${p} 페이지`}
            className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition ${
              p === currentPage
                ? 'bg-brand-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => canNext && onChange(currentPage + 1)}
        disabled={!canNext}
        aria-label="다음 페이지"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  )
}

type PageItem = number | 'ellipsis'

function computePageList(
  current: number,
  total: number,
  sibling: number,
): PageItem[] {
  // 페이지 수가 적으면 전부 노출
  if (total <= 5 + sibling * 2) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const start = Math.max(2, current - sibling)
  const end = Math.min(total - 1, current + sibling)
  const result: PageItem[] = [1]

  if (start > 2) result.push('ellipsis')
  for (let p = start; p <= end; p++) result.push(p)
  if (end < total - 1) result.push('ellipsis')

  result.push(total)
  return result
}
