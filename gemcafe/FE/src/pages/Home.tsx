import { useCounterStore } from '@/stores/useCounterStore'

export default function Home() {
  const { count, increase, decrease } = useCounterStore()

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Home</h1>
      <p className="text-slate-600">
        Vite + React + TS + Router + Zustand + Tailwind + Axios ready.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={decrease}
          className="rounded bg-slate-800 px-3 py-1 text-white hover:bg-slate-700"
        >
          -
        </button>
        <span className="text-xl font-mono">{count}</span>
        <button
          onClick={increase}
          className="rounded bg-slate-800 px-3 py-1 text-white hover:bg-slate-700"
        >
          +
        </button>
      </div>
    </section>
  )
}
