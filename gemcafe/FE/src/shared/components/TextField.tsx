import type { InputHTMLAttributes, ReactNode } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  rightSlot?: ReactNode
  icon?: ReactNode
}

export default function TextField({
  label,
  rightSlot,
  icon,
  className = '',
  ...rest
}: Props) {
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
          className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 ${
            icon ? 'pl-11' : ''
          } ${className}`}
          {...rest}
        />
      </div>
    </div>
  )
}
