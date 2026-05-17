import type { InputHTMLAttributes, ReactNode } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  rightSlot?: ReactNode
  icon?: ReactNode
  /** 입력값 검증 실패 시 표시할 에러 메시지. 값이 있으면 빨간 테두리 + 하단 에러 텍스트. */
  error?: string | null
}

export default function TextField({
  label,
  rightSlot,
  icon,
  error,
  className = '',
  ...rest
}: Props) {
  const hasError = !!error
  return (
    <div className="space-y-2">
      {(label || rightSlot) && (
        <div className="flex items-center justify-between">
          {label && (
            <label className="text-sm font-medium text-gray-700">
              {label}
            </label>
          )}
          {rightSlot}
        </div>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        )}
        <input
          aria-invalid={hasError || undefined}
          className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
            hasError
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
              : 'border-gray-200 focus:border-brand-400 focus:ring-brand-100'
          } ${icon ? 'pl-11' : ''} ${className}`}
          {...rest}
        />
      </div>
      {hasError && (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      )}
    </div>
  )
}
