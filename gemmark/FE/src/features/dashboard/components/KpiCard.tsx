import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  badge: string
  label: string
  value: string
  sub?: string
}

export default function KpiCard({ icon: Icon, badge, label, value, sub }: Props) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-10 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600">
          {badge}
        </span>
      </div>
      <div className="mb-1 text-sm text-gray-500">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
    </div>
  )
}
