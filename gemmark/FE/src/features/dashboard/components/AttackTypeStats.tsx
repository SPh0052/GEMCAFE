const items = [
  { label: 'H.264 재인코딩', value: 94 },
  { label: '해상도 축소', value: 88 },
  { label: '밝기/대비', value: 96 },
  { label: '크롭 20%', value: 72 },
  { label: 'SNS 업로드 시뮬', value: 65 },
]

export default function AttackTypeStats() {
  return (
    <div className="h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold">공격 유형별 통과율</h2>
      <div className="space-y-5">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-700">{item.label}</span>
              <span className="font-semibold text-brand-500">{item.value}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
