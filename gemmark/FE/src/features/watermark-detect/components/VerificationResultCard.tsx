import { ShieldCheck } from 'lucide-react'
import Card from '@/shared/components/Card'
import Badge from '@/shared/components/Badge'

interface Props {
  fileName: string
  verified?: boolean
}

export default function VerificationResultCard({
  fileName,
  verified = true,
}: Props) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Verification Result
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Analysis for{' '}
            <span className="font-mono text-brand-500">{fileName}</span>
          </p>
        </div>
        <Badge tone={verified ? 'success' : 'danger'} dot>
          <ShieldCheck className="mr-0.5 h-3 w-3" />
          {verified ? 'VERIFIED' : 'NOT VERIFIED'}
        </Badge>
      </div>
    </Card>
  )
}
