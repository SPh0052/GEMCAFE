import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

interface Props {
  /** 부모가 가진 확정 값 (URL이나 상위 state에서 동기화). */
  value: string
  /** debounceMs 동안 추가 입력이 없을 때 호출. 외부에서 commit 처리. */
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
}

/**
 * 입력 즉시 화면에 반영하되, 부모로의 onChange 는 debounceMs 만큼 지연시키는 검색 input.
 *
 * 외부 value 가 바뀌면(URL 직접 변경 등) 내부 draft 도 동기화.
 */
export default function SearchInput({
  value,
  onChange,
  placeholder = '검색...',
  debounceMs = 300,
  className = '',
}: Props) {
  const [draft, setDraft] = useState(value)

  // 부모 -> 내부 동기화 (URL 변경, 외부 reset 등)
  useEffect(() => {
    setDraft(value)
  }, [value])

  // 매 렌더에서 최신 onChange 를 ref로 보관 → effect dep 제외 가능
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // 내부 -> 부모 디바운스 통지
  useEffect(() => {
    if (draft === value) return
    const t = setTimeout(() => {
      onChangeRef.current(draft)
    }, debounceMs)
    return () => clearTimeout(t)
  }, [draft, value, debounceMs])

  const handleClear = () => {
    setDraft('')
    onChangeRef.current('')
  }

  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      {draft && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="검색어 지우기"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
