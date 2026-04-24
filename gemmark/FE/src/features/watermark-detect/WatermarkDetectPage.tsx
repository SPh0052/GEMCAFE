import { ChevronDown, Eye, Search, ShieldCheck } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import Card from '@/shared/components/Card'
import FileDropZone from '@/shared/components/FileDropZone'
import Badge from '@/shared/components/Badge'

type Status = 'detected' | 'notDetected' | 'processing'

interface VerificationRow {
  no: string
  projectId: string
  status: Status
  asset: { name: string; size: string; duration: string }
  requestedAt: string
}

const rows: VerificationRow[] = [
  {
    no: '01',
    projectId: 'AMB-2023-9842',
    status: 'detected',
    asset: {
      name: 'marketing_video_v2.mp4',
      size: '14.2 MB',
      duration: '00:30',
    },
    requestedAt: '2023.10.24 14:30:12',
  },
  {
    no: '02',
    projectId: 'AMB-2023-9841',
    status: 'notDetected',
    asset: { name: 'product_hero_final.jpg', size: '2.1 MB', duration: '' },
    requestedAt: '2023.10.24 12:15:45',
  },
  {
    no: '03',
    projectId: 'AMB-2023-9840',
    status: 'processing',
    asset: {
      name: 'internal_demo_draft.mp4',
      size: '65.4 MB',
      duration: '00:12',
    },
    requestedAt: '2023.10.24 09:42:00',
  },
  {
    no: '04',
    projectId: 'AMB-2023-9839',
    status: 'detected',
    asset: { name: 'press_kit_b_roll.mp4', size: '210.0 MB', duration: '12:45' },
    requestedAt: '2023.10.23 18:22:11',
  },
]

const statusBadge: Record<Status, { tone: 'success' | 'danger' | 'info'; label: string }> = {
  detected: { tone: 'success', label: '+ Detected' },
  notDetected: { tone: 'danger', label: '+ Not Detected' },
  processing: { tone: 'info', label: '+ Processing' },
}

const extractedWatermark = [
  {
    field: 'UUID',
    value: '550e8400-e29b-41d4-a716-446655440000',
    ok: true,
  },
  { field: 'Business ID', value: 'AMBER_GLOBAL_01', ok: true },
  { field: 'Generation Model', value: 'Flux-D-Watermark-V2', ok: true },
  { field: 'Timestamp', value: '2024-05-20 14:32:05 UTC', ok: true },
  { field: 'User ID', value: 'usr_9488210', ok: true },
  { field: 'Version', value: 'v1.4.2-stable', ok: true },
]

export default function WatermarkDetect() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="워터마크 검증"
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600"
          >
            <Search className="h-4 w-4" />
            워터마크 검출
          </button>
        }
      />

      <FileDropZone />

      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <div className="text-sm font-semibold">Verification Result</div>
            <div className="mt-0.5 text-xs text-gray-500">
              Analysis for{' '}
              <span className="font-mono text-brand-500">
                sample_video_001.mp4
              </span>
            </div>
          </div>
          <Badge tone="success" dot>
            <ShieldCheck className="mr-0.5 h-3 w-3" /> VERIFIED
          </Badge>
        </div>

        <div className="px-6 py-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            검출된 워터마크
          </h3>
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">FIELD NAME</th>
                  <th className="px-4 py-3 font-medium">EXTRACTED VALUE</th>
                  <th className="px-4 py-3 font-medium">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {extractedWatermark.map((row) => (
                  <tr key={row.field}>
                    <td className="px-4 py-3 text-gray-600">{row.field}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-brand-500">
                        {row.value}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Filters />
      <VerificationTable rows={rows} />
    </div>
  )
}

function Filters() {
  const items = [
    { label: 'STATUS', placeholder: 'All Status' },
    { label: 'FILE TYPE', placeholder: 'All Assets' },
    { label: 'DATE RANGE', placeholder: '2023.10.01 - 2023.10.31' },
    { label: 'PROJECT ID', placeholder: 'Search ID...' },
  ]
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      {items.map((it) => (
        <div key={it.label}>
          <label className="mb-1.5 block text-[11px] font-medium tracking-wide text-gray-500">
            {it.label}
          </label>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
            <span className="truncate">{it.placeholder}</span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      ))}
    </div>
  )
}

function VerificationTable({ rows }: { rows: VerificationRow[] }) {
  return (
    <Card className="p-0">
      <div className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-xs font-medium tracking-wide text-gray-500">
              <th className="px-5 py-3 font-medium">#</th>
              <th className="px-5 py-3 font-medium">PROJECT ID</th>
              <th className="px-5 py-3 font-medium">STATUS</th>
              <th className="px-5 py-3 font-medium">ASSET PREVIEW</th>
              <th className="px-5 py-3 font-medium">REQUEST DATE/TIME</th>
              <th className="px-5 py-3 font-medium">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const s = statusBadge[row.status]
              return (
                <tr key={row.no} className="hover:bg-gray-50/50">
                  <td className="px-5 py-4 text-gray-500">{row.no}</td>
                  <td className="px-5 py-4 font-mono text-xs text-brand-500">
                    {row.projectId}
                  </td>
                  <td className="px-5 py-4">
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-16 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200" />
                      <div>
                        <div className="text-sm text-gray-800">
                          {row.asset.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {row.asset.size}
                          {row.asset.duration && ` · ${row.asset.duration}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{row.requestedAt}</td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      aria-label="상세 보기"
                      className="text-gray-400 hover:text-brand-500"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
        <span>Showing 1 to 10 of 42 results</span>
        <Pagination />
      </div>
    </Card>
  )
}

function Pagination() {
  const pages = ['1', '2', '3', '...', '5']
  return (
    <div className="flex items-center gap-1">
      {pages.map((p, i) => (
        <button
          key={i}
          type="button"
          className={`flex h-7 min-w-[28px] items-center justify-center rounded-md px-2 text-xs ${
            p === '1'
              ? 'bg-brand-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
        aria-label="다음 페이지"
      >
        ›
      </button>
    </div>
  )
}
