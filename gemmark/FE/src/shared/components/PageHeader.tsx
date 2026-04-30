import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface Props {
  title: string
  description?: string
  actions?: ReactNode
  backTo?: string
  backLabel?: string
}

export default function PageHeader({
  title,
  description,
  actions,
  backTo,
  backLabel = '목록으로',
}: Props) {
  return (
    <div className="space-y-2 pt-2 pb-1">
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
