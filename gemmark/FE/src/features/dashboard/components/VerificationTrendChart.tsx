const bins: { label: string; value: number; color: string }[] = [
  { label: '0~10', value: 12, color: 'bg-brand-100' },
  { label: '10~20', value: 28, color: 'bg-brand-200' },
  { label: '20~30', value: 50, color: 'bg-brand-300' },
  { label: '30~40', value: 72, color: 'bg-brand-400' },
  { label: '40이상', value: 88, color: 'bg-brand-600' },
]

export default function VerificationTrendChart() {
  return (
    <div className="h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">PSNR 검증 추이</h2>
      <p className="mt-1 text-sm text-gray-500">PSNR 구간별 영상 수 테스트</p>

      <div className="relative mt-6 h-60">
        {/* 가로 그리드 라인 */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-t border-dashed border-gray-100" />
          ))}
        </div>

        {/* 막대들 */}
        <div className="relative flex h-full items-end gap-6 px-2">
          {bins.map((bin) => (
            <div key={bin.label} className="flex flex-1 items-end justify-center">
              <div
                className={`w-full rounded-t-md ${bin.color}`}
                style={{ height: `${bin.value}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* x축 레이블 */}
      <div className="mt-3 flex gap-6 px-2">
        {bins.map((bin) => (
          <div
            key={bin.label}
            className="flex-1 text-center text-xs font-medium text-gray-500"
          >
            {bin.label}
          </div>
        ))}
      </div>
    </div>
  )
}
