import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone } from 'lucide-react'
import MobileShell from '@/shared/components/MobileShell'
import Button from '@/shared/components/Button'
import TextField from '@/shared/components/TextField'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import { registerUser } from './userRegistry'

export default function CompleteSignupPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setPhone = useAuthStore((s) => s.setPhone)
  const [phoneInput, setPhoneInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 이미 가입 완료된 사용자가 이 페이지로 들어오면 메인으로 보냄
  useEffect(() => {
    if (user?.phone) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setError('로그인 상태가 아닙니다. 다시 로그인해주세요.')
      return
    }
    const cleaned = phoneInput.replace(/[^0-9]/g, '')
    if (cleaned.length < 10 || cleaned.length > 11) {
      setError('전화번호를 정확히 입력해주세요. (10~11자리 숫자)')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // BE 붙기 전 mock — 로컬 레지스트리에 가입 정보 저장
      registerUser(user.sub, { phone: cleaned })
      setPhone(cleaned)
      navigate('/', { replace: true })
    } catch (err) {
      console.error('회원가입 완료 실패', err)
      setError('잠시 후 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MobileShell>
      <div className="flex flex-1 flex-col px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            거의 다 됐어요!
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            서비스 이용을 위해 전화번호를 입력해주세요.
          </p>
        </div>

        {user && (
          <div className="mb-6 rounded-2xl bg-gray-50 px-4 py-3">
            <div className="text-xs text-gray-500">로그인된 계정</div>
            <div className="mt-1 truncate text-sm font-medium text-gray-800">
              {user.email}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
          <TextField
            label="전화번호"
            type="tel"
            inputMode="numeric"
            placeholder="01012345678"
            icon={<Phone className="h-4 w-4" />}
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            autoFocus
          />

          {error && (
            <p className="text-sm text-rose-600">{error}</p>
          )}

          <div className="mt-auto pt-4">
            <Button
              type="submit"
              size="lg"
              fullWidth
              disabled={submitting}
            >
              {submitting ? '저장 중...' : '가입 완료'}
            </Button>
          </div>
        </form>
      </div>
    </MobileShell>
  )
}
