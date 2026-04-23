import { Link, Route, Routes } from 'react-router-dom'
import Home from '@/pages/Home'
import About from '@/pages/About'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <Link to="/" className="font-semibold">
            gemcafe
          </Link>
          <Link to="/about" className="text-sm text-slate-600 hover:text-slate-900">
            About
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
    </div>
  )
}
