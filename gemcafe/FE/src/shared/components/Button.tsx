import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'md' | 'lg'
  children: ReactNode
  fullWidth?: boolean
}

const variantMap = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm',
  outline: 'border border-gray-200 bg-white text-gray-800 hover:bg-gray-50',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-50',
}

const sizeMap = {
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3.5 text-base',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth = false,
  className = '',
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition ${
        fullWidth ? 'w-full' : ''
      } ${variantMap[variant]} ${sizeMap[size]} disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
