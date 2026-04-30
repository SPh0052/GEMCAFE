import { Link } from 'react-router-dom'

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center border-b border-gray-100 bg-white px-5 py-3">
      <Link
        to="/"
        aria-label="gem.cafe 홈"
        className="flex items-center gap-2"
      >
        <img src="/logo.png" alt="" className="h-9 w-auto" />
        <img src="/logo_text.png" alt="gem.cafe" className="h-6 w-auto" />
      </Link>
    </header>
  )
}
