const data = [
  { insert: 30, verify: 45, highlighted: true },
  { insert: 50, verify: 75 },
  { insert: 28, verify: 48 },
  { insert: 42, verify: 65 },
  { insert: 58, verify: 82 },
  { insert: 60, verify: 88 },
  { insert: 48, verify: 78 },
]

export default function VerificationTrendChart() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">일별 검증 추이 (최근 14일)</h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
            <span className="text-gray-600">삽입 요청</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-200" />
            <span className="text-gray-600">검증 요청</span>
          </div>
        </div>
      </div>

      <div className="relative h-52">
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-brand-200/60" />
        <div className="relative flex h-full items-end gap-4 px-1">
          {data.map((d, i) => (
            <div
              key={i}
              className={`relative flex flex-1 flex-col justify-end ${
                d.highlighted ? 'rounded-md ring-2 ring-gray-300' : ''
              }`}
            >
              <div
                style={{ height: `${d.verify}%` }}
                className="rounded-t-sm bg-brand-100"
              />
              <div
                style={{ height: `${d.insert}%` }}
                className="bg-brand-300"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-between px-1 text-[11px] tracking-widest text-gray-400">
        <span>14 DAYS AGO</span>
        <span>7 DAYS AGO</span>
        <span>TODAY</span>
      </div>
    </div>
  )
}
