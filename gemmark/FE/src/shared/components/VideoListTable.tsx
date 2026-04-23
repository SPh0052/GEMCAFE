import { FileVideo, RotateCw } from 'lucide-react'

export interface VideoRow {
  no: number
  name: string
  createdAt: string
  type: string
  size: string
}

const mockVideos: VideoRow[] = [
  { no: 1, name: '10KM_ai_video_1.mp4', createdAt: '2024.03.15 14:32', type: 'MP4 Video', size: '345 MB' },
  { no: 2, name: '10KM_ai_video_2.mp4', createdAt: '2024.03.15 14:33', type: 'MP4 Video', size: '412 MB' },
  { no: 3, name: '10KM_ai_video_3.mp4', createdAt: '2024.03.16 09:15', type: 'MP4 Video', size: '298 MB' },
  { no: 4, name: '10KM_ai_video_4.mp4', createdAt: '2024.03.16 09:16', type: 'MP4 Video', size: '521 MB' },
  { no: 5, name: '10KM_ai_video_5.mp4', createdAt: '2024.03.17 11:05', type: 'MP4 Video', size: '388 MB' },
]

interface Props {
  title?: string
  subtitle?: string
  rows?: VideoRow[]
}

export default function VideoListTable({
  title = '원본 영상',
  subtitle = '워터마크 삽입',
  rows = mockVideos,
}: Props) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 className="text-sm font-semibold text-gray-700">
          {title}
          {subtitle && (
            <span className="ml-2 text-gray-400">| {subtitle}</span>
          )}
        </h2>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:underline"
        >
          <RotateCw className="h-3.5 w-3.5" />
          목록 업데이트
        </button>
      </div>
      <div className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-gray-100 bg-gray-50/60 text-left text-xs font-medium tracking-wide text-gray-500">
              <th className="px-6 py-3 font-medium">No.</th>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Created Date</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.no} className="hover:bg-gray-50/60">
                <td className="px-6 py-4 text-gray-500">{row.no}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-2">
                    <FileVideo className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-800">{row.name}</span>
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{row.createdAt}</td>
                <td className="px-6 py-4 text-gray-500">{row.type}</td>
                <td className="px-6 py-4 text-gray-500">{row.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
