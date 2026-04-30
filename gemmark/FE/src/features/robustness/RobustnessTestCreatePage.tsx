import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Check, ChevronsUpDown, Play } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'

interface VideoItem {
  id: string
  fileName: string
  createdAt: string
  size: string
  format: 'MP4' | 'MOV'
  lastTestResult: '성공' | '실패' | null
}

const mockVideos: VideoItem[] = [
  { id: 'v001', fileName: 'video_001.mp4', createdAt: '2024.03.15 11:00', size: '120MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v002', fileName: 'video_002.mp4', createdAt: '2024.03.15 11:00', size: '120MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v003', fileName: 'video_003.mov', createdAt: '2024.03.15 11:00', size: '120MB', format: 'MOV', lastTestResult: '성공' },
  { id: 'v004', fileName: 'video_004.mp4', createdAt: '2024.03.15 11:00', size: '120MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v005', fileName: 'video_005.mp4', createdAt: '2024.03.15 11:00', size: '120MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v006', fileName: 'video_006.mp4', createdAt: '2024.03.15 11:00', size: '120MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v007', fileName: 'video_007.mp4', createdAt: '2024.03.15 11:00', size: '120MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v008', fileName: 'video_008.mp4', createdAt: '2024.03.15 11:00', size: '120MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v009', fileName: 'video_009.mov', createdAt: '2024.03.15 11:00', size: '120MB', format: 'MOV', lastTestResult: '성공' },
  { id: 'v010', fileName: 'video_010.mp4', createdAt: '2024.03.15 11:00', size: '120MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v011', fileName: 'video_011.mov', createdAt: '2024.03.16 09:30', size: '95MB', format: 'MOV', lastTestResult: '성공' },
  { id: 'v012', fileName: 'video_012.mp4', createdAt: '2024.03.16 09:31', size: '210MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v013', fileName: 'video_013.mp4', createdAt: '2024.03.16 09:32', size: '180MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v014', fileName: 'video_014.mov', createdAt: '2024.03.16 10:05', size: '305MB', format: 'MOV', lastTestResult: '성공' },
  { id: 'v015', fileName: 'video_015.mp4', createdAt: '2024.03.16 10:06', size: '155MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v016', fileName: 'video_016.mp4', createdAt: '2024.03.17 13:12', size: '142MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v017', fileName: 'video_017.mp4', createdAt: '2024.03.17 13:14', size: '165MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v018', fileName: 'video_018.mp4', createdAt: '2024.03.17 13:15', size: '198MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v019', fileName: 'video_019.mov', createdAt: '2024.03.17 13:16', size: '275MB', format: 'MOV', lastTestResult: '성공' },
  { id: 'v020', fileName: 'video_020.mp4', createdAt: '2024.03.17 13:18', size: '150MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v021', fileName: 'video_021.mp4', createdAt: '2024.03.18 09:00', size: '125MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v022', fileName: 'video_022.mp4', createdAt: '2024.03.18 09:02', size: '130MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v023', fileName: 'video_023.mp4', createdAt: '2024.03.18 09:05', size: '140MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v024', fileName: 'video_024.mp4', createdAt: '2024.03.18 09:10', size: '145MB', format: 'MP4', lastTestResult: '성공' },
  { id: 'v025', fileName: 'video_025.mp4', createdAt: '2024.03.18 09:12', size: '160MB', format: 'MP4', lastTestResult: '성공' },
]

const columns: { key: keyof VideoItem; label: string }[] = [
  { key: 'fileName', label: '영상 파일명' },
  { key: 'createdAt', label: '생성 일자' },
  { key: 'size', label: '크기' },
  { key: 'format', label: '형식' },
  { key: 'lastTestResult', label: '마지막 테스트 결과' },
]

export default function RobustnessTestCreatePage() {
  const navigate = useNavigate()
  const [startAt, setStartAt] = useState('2024-03-14T09:00')
  const [endAt, setEndAt] = useState('2024-03-18T16:30')
  const [videos] = useState<VideoItem[]>(mockVideos)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const allSelected = useMemo(
    () => videos.length > 0 && selectedIds.size === videos.length,
    [videos, selectedIds],
  )

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(videos.map((v) => v.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleStart = () => {
    if (selectedIds.size === 0) return
    // TODO: 실제 강건성 테스트 시작 API 연결 — 새 testId를 백엔드에서 받아서 이동
    navigate('/robustness/T-2024-006')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="강건성 테스트" backTo="/robustness" />

      {/* 기간 설정 + 테스트 시작 */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700">테스트 기간 설정</span>
        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none"
        />
        <span className="text-gray-400">-</span>
        <div className="relative">
          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none"
          />
          <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
        <button
          type="button"
          onClick={handleStart}
          disabled={selectedIds.size === 0}
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Play className="h-4 w-4" />
          테스트 시작
        </button>
      </div>

      {/* 영상 선택 테이블 */}
      <div className="rounded-2xl bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/40 text-left">
              <th className="w-12 px-6 py-3.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="전체 선택"
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
              </th>
              {columns.map((col) => (
                <th key={col.key} className="px-6 py-3.5">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-800 transition hover:text-brand-600"
                  >
                    <span>{col.label}</span>
                    <ChevronsUpDown className="h-3 w-3 text-gray-300" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => {
              const checked = selectedIds.has(video.id)
              return (
                <tr
                  key={video.id}
                  onClick={() => toggleOne(video.id)}
                  className="cursor-pointer border-b border-gray-100 last:border-b-0 transition hover:bg-gray-50/60"
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(video.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`${video.fileName} 선택`}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-800">{video.fileName}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{video.createdAt}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{video.size}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{video.format}</td>
                  <td className="px-6 py-4">
                    {video.lastTestResult === '성공' && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </span>
                        성공
                      </span>
                    )}
                    {video.lastTestResult === '실패' && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500">
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </span>
                        실패
                      </span>
                    )}
                    {video.lastTestResult === null && (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 하단 액션 바 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={toggleAll}
          className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          {allSelected ? '선택 해제' : '모두 선택'}
        </button>
        <span className="text-sm text-gray-700">
          선택된 영상 수:{' '}
          <span className="font-bold text-gray-900">{selectedIds.size}</span>개
        </span>
      </div>
    </div>
  )
}
