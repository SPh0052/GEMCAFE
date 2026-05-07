import { ChevronsUpDown } from 'lucide-react'
import Thumbnail from './Thumbnail'

export interface VideoRow {
  no: number
  /** 백엔드 식별자 (예: contentUuid). 상세 이동에 사용. 없으면 no가 fallback. */
  uuid?: string
  name: string
  createdAt: string
  type: string
  size: string
  thumbnailUrl?: string
}

const mockVideos: VideoRow[] = [
  { no: 1, name: '10kM_ai_video_1.mp4', createdAt: '2024.03.15 14:32', type: 'MP4 Video', size: '345 MB' },
  { no: 2, name: '10kM_ai_video_2.mp4', createdAt: '2024.03.15 14:33', type: 'MP4 Video', size: '412 MB' },
  { no: 3, name: '10kM_ai_video_3.mp4', createdAt: '2024.03.16 09:15', type: 'MP4 Video', size: '298 MB' },
  { no: 4, name: '10kM_ai_video_4.mp4', createdAt: '2024.03.16 09:16', type: 'MP4 Video', size: '521 MB' },
  { no: 5, name: '10kM_ai_video_5.mp4', createdAt: '2024.03.17 11:05', type: 'MP4 Video', size: '388 MB' },
]

const columns: { key: keyof VideoRow; label: string; sub: string }[] = [
  { key: 'no', label: 'No.', sub: '순서' },
  { key: 'name', label: 'Name', sub: '이름' },
  { key: 'createdAt', label: 'Created Date', sub: '생성한 날짜' },
  { key: 'type', label: 'Type', sub: '유형' },
  { key: 'size', label: 'Size', sub: '크기' },
]

interface Props {
  rows?: VideoRow[]
  onRowClick?: (row: VideoRow) => void
}

export default function VideoListTable({
  rows = mockVideos,
  onRowClick,
}: Props) {
  return (
    <div className="rounded-2xl bg-white shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/40 text-left">
            {columns.map((col) => (
              <th key={col.key} className="px-6 py-3.5">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-800 transition hover:text-brand-600"
                >
                  <span>{col.label}</span>
                  <span className="text-xs font-normal text-gray-400">
                    {col.sub}
                  </span>
                  <ChevronsUpDown className="h-3 w-3 text-gray-300" />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.no}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-gray-100 last:border-b-0 transition hover:bg-gray-50/60 ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
            >
              <td className="px-6 py-4 text-sm text-gray-700">{row.no}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <Thumbnail src={row.thumbnailUrl} />
                  <span className="text-sm text-gray-800">{row.name}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">{row.createdAt}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{row.type}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{row.size}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
