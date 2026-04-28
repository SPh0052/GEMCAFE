import { useNavigate } from 'react-router-dom'
import PageHeader from '@/shared/components/PageHeader'
import VideoListTable from '@/shared/components/VideoListTable'

export default function WatermarkInsert() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <PageHeader
        title="워터마크 삽입"
        actions={
          <button
            type="button"
            onClick={() => navigate('/insert/new')}
            className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
          >
            워터마크 생성
          </button>
        }
      />

      <VideoListTable onRowClick={(row) => navigate(`/insert/${row.no}`)} />
    </div>
  )
}
