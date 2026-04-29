const items: { label: string; value: number }[] = [
  { label: 'H.264(AVC) 재인코딩', value: 94 },
  { label: 'JPEG압축(Q50)', value: 88 },
  { label: '크롭', value: 72 },
  { label: '해상도 축소(720p→480p)', value: 86 },
  { label: '밝기/대비 조정', value: 96 },
  { label: '가우시안 노이즈 (σ25)', value: 78 },
  { label: '좌우반전', value: 91 },
]

export default function AttackTypeStats() {
  return (
    <div className="h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold text-gray-900">
        공격 유형별 통과율
      </h2>
      <div className="space-y-4">
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
