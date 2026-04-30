import { ShieldCheck } from 'lucide-react'
import Card from '@/shared/components/Card'
import Badge from '@/shared/components/Badge'
import Thumbnail from '@/shared/components/Thumbnail'

interface Props {
  fileName: string
  verified?: boolean
  thumbnailUrl?: string
}

export default function VerificationResultCard({
  fileName,
  verified = true,
  thumbnailUrl,
}: Props) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Thumbnail src={thumbnailUrl} className="h-32 w-48" />
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900">
              Verification Result
            </h3>
            <p className="mt-1 truncate text-sm text-gray-500">
              Analysis for{' '}
              <span className="font-mono text-brand-500">{fileName}</span>
            </p>
          </div>
        </div>
        <Badge tone={verified ? 'success' : 'danger'} dot>
          <ShieldCheck className="mr-0.5 h-3 w-3" />
          {verified ? 'VERIFIED' : 'NOT VERIFIED'}
        </Badge>
      </div>
    </Card>
  )
}
