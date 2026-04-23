import { Download, Sparkles } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import Card from '@/shared/components/Card'
import FileDropZone from '@/shared/components/FileDropZone'
import VideoListTable from '@/shared/components/VideoListTable'
import Badge from '@/shared/components/Badge'

const resultMeta = [
  { label: '삽입된 페이로드 (144 bit)', value: '' },
  { label: '버전', value: 'v1 (DCT)' },
  { label: '사업자 ID', value: 'gemgem (0x01)' },
  { label: '콘텐츠 UUID', value: 'a3f2e9c1-b847-4d21-9f3a' },
  { label: '다운로더 user_id', value: 'u8721 (5eA-256 32bit)' },
  { label: '생성 타임스탬프', value: '2026-04-15 14:32:17' },
  { label: 'ECC', value: 'BCH (33% 리던던시)' },
]

export default function WatermarkInsert() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="워터마크 삽입"
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600"
          >
            <Sparkles className="h-4 w-4" />
            워터마크 생성
          </button>
        }
      />

      <FileDropZone />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">생성된 영상 목록</h2>
          <button
            type="button"
            className="text-xs font-medium text-brand-500 hover:underline"
          >
            ↻ 목록 업데이트
          </button>
        </div>

        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h3 className="text-sm font-semibold">
              삽입 결과 — sample_video_001.mp4
            </h3>
            <Badge tone="success" dot>
              성공
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-6 px-6 py-5 md:grid-cols-2">
            <div>
              <div className="text-xs text-gray-500">처리 시간</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">4.82초</div>
              <div className="mt-0.5 text-xs text-gray-400">28.4 FPS</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">PSNR (화질 열화)</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">
                44.2 dB
              </div>
              <div className="mt-0.5 text-xs font-medium text-emerald-600">
                영상 검증
              </div>
            </div>
          </div>

          <dl className="divide-y divide-gray-100 border-t border-gray-100 px-6">
            {resultMeta.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-3 text-sm"
              >
                <dt className="text-gray-500">{item.label}</dt>
                <dd className="font-mono text-gray-800">{item.value}</dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600"
            >
              <Download className="h-4 w-4" />
              워터마크 영상 다운로드
            </button>
          </div>
        </Card>
      </section>

      <VideoListTable />
    </div>
  )
}
