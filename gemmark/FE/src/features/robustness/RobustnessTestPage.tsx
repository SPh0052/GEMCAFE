import { useNavigate } from 'react-router-dom'
import { Play } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import VideoListTable from '@/shared/components/VideoListTable'

export default function RobustnessTest() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <PageHeader
        title="강건성 테스트"
        description="포렌식 워터마킹을 위한 편집 강건성 분석."
        actions={
          <button
            type="button"
            onClick={() => navigate('/robustness/new')}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600"
          >
            <Play className="h-4 w-4" />
            테스트 시작
          </button>
        }
      />

      <VideoListTable title="강건성 테스트" />
    </div>
  )
}
