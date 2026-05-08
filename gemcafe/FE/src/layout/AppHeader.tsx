import { Link } from 'react-router-dom'

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-20 flex items-center border-b border-gray-100 bg-white px-5 py-3 md:px-8">
      <Link
        to="/"
        aria-label="gem.cafe 홈"
        className="flex items-center gap-2"
      >
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt=""
          className="h-9 w-auto"
        />
        <img
          src={`${import.meta.env.BASE_URL}logo_text.png`}
          alt="gem.cafe"
          className="h-6 w-auto"
        />
      </Link>
    </header>
  )
}
