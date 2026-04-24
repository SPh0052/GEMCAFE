import type { ReactNode } from 'react'

type Tone = 'success' | 'danger' | 'warning' | 'info' | 'brand' | 'neutral'

interface Props {
  tone?: Tone
  children: ReactNode
  dot?: boolean
  className?: string
}

const toneMap: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  danger: 'bg-rose-50 text-rose-600 ring-rose-100',
  warning: 'bg-amber-50 text-amber-600 ring-amber-100',
  info: 'bg-sky-50 text-sky-600 ring-sky-100',
  brand: 'bg-brand-50 text-brand-600 ring-brand-100',
  neutral: 'bg-gray-100 text-gray-600 ring-gray-200',
}

const dotMap: Record<Tone, string> = {
  success: 'bg-emerald-500',
  danger: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
  brand: 'bg-brand-500',
  neutral: 'bg-gray-500',
}

export default function Badge({
  tone = 'neutral',
  children,
  dot = false,
  className = '',
}: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${toneMap[tone]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotMap[tone]}`} />}
      {children}
    </span>
  )
}
