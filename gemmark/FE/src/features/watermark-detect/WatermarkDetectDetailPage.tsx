import { useParams } from 'react-router-dom'
import PageHeader from '@/shared/components/PageHeader'
import VerificationResultCard from './components/VerificationResultCard'
import ExtractedWatermarkCard from './components/ExtractedWatermarkCard'

export default function WatermarkDetectDetailPage() {
  // 실제 앱에서는 id로 서버에서 결과를 조회. 지금은 mock.
  useParams<{ id: string }>()

  const fileName = 'sample_video_001.mp4'

  return (
    <div className="space-y-6">
      <PageHeader title="워터마크 검증 내역" backTo="/detect" />
      <VerificationResultCard fileName={fileName} verified />
      <ExtractedWatermarkCard />
    </div>
  )
}
