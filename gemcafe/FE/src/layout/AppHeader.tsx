import { UtensilsCrossed } from 'lucide-react'

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-100 bg-white px-5 py-4">
      <UtensilsCrossed className="h-6 w-6 text-brand-500" />
      <span className="text-xl font-bold tracking-tight">
        <span className="text-brand-500">gem</span>.cafe
      </span>
    </header>
  )
}
