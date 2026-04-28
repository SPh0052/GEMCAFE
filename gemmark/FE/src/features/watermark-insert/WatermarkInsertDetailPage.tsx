import { useParams } from 'react-router-dom'
import { Download, RotateCw } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import Card from '@/shared/components/Card'
import Badge from '@/shared/components/Badge'
import Thumbnail from '@/shared/components/Thumbnail'

export default function WatermarkInsertDetailPage() {
  // 실제 앱에서는 id로 서버에서 결과를 조회. 지금은 mock.
  useParams<{ id: string }>()

  const result = {
    fileName: 'sample_video_001.mp4',
    status: '성공' as const,
    processingTime: '4.82초',
    fps: '28.4 FPS',
    psnr: '44.2 dB',
    psnrNote: '열화 없음',
    payload: {
      bits: 144,
      businessId: 'gemgem (0x01)',
      uuid: 'a3f2e9c1-b847-4d21-9f3a',
      timestamp: '2026-04-15 14:32:17',
      hex: 'E8B7B503',
    },
  }

  return (
    <div className="space-y-6">
      <PageHeader title="워터마크 삽입 내역" backTo="/insert" />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">
            생성된 영상 목록
          </h2>
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:underline"
          >
            <RotateCw className="h-3.5 w-3.5" />
            목록 업데이트
          </button>
        </div>

        <Card className="p-0">
          {/* 결과 헤더 */}
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <Thumbnail className="h-32 w-48" />
              <h3 className="truncate text-base font-bold text-gray-900">
                삽입 결과 — {result.fileName}
              </h3>
            </div>
            <Badge tone="success">{result.status}</Badge>
          </div>

          {/* 핵심 메트릭 2개 */}
          <div className="grid grid-cols-2 gap-6 px-6 py-5">
            <div>
              <div className="text-xs text-gray-500">처리 시간</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">
                {result.processingTime}
              </div>
              <div className="mt-0.5 text-xs text-gray-400">{result.fps}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">삽입 PSNR (화질 열화)</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">
                {result.psnr}
              </div>
              <div className="mt-0.5 text-xs font-medium text-emerald-600">
                {result.psnrNote}
              </div>
            </div>
          </div>

          {/* 페이로드 섹션 */}
          <div className="border-t border-gray-100 px-6 pt-4 pb-1">
            <div className="text-sm font-semibold text-gray-700">
              삽입된 페이로드 ({result.payload.bits} bit)
            </div>
          </div>

          <dl className="px-6">
            <Row label="사업자 ID" value={result.payload.businessId} />
            <Row label="콘텐츠 UUID" value={result.payload.uuid} mono />
            <Row label="생성 타임스탬프" value={result.payload.timestamp} mono />
            <Row label="워터마크 HEX" value={result.payload.hex} mono />
          </dl>

          {/* 다운로드 버튼 */}
          <div className="border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
            >
              <Download className="h-4 w-4" />
              워터마크 영상 다운로드
            </button>
          </div>
        </Card>
      </section>
    </div>
  )
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between border-t border-gray-100 py-3 first:border-t-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd
        className={`text-sm font-semibold text-gray-900 ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </dd>
    </div>
  )
}
