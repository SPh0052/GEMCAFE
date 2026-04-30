import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MobileShell from '@/shared/components/MobileShell'
import Button from '@/shared/components/Button'
import TextField from '@/shared/components/TextField'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import { Check } from 'lucide-react'

export default function SignupPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const [form, setForm] = useState({
    nickname: '',
    email: '',
    password: '',
    passwordConfirm: '',
  })
  const [agreements, setAgreements] = useState({
    service: false,
    privacy: false,
  })

  const canSubmit =
    form.nickname &&
    form.email &&
    form.password &&
    form.password === form.passwordConfirm &&
    agreements.service &&
    agreements.privacy

  const handleSignup = () => {
    // BE 붙기 전 mock — 이메일을 식별자로 임시 sub 생성.
    // 진짜 회원가입 API가 생기면 응답의 user.id (또는 sub)을 사용.
    login({
      sub: 'mock-' + form.email,
      nickname: form.nickname,
      email: form.email,
      gem: 10000,
    })
    navigate('/')
  }

  return (
    <MobileShell>
      <div className="flex flex-1 flex-col px-6 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">회원가입</h1>
          <p className="mt-1 text-sm text-gray-500">
            gem.cafe에 오신 것을 환영합니다.
          </p>
        </header>

        <div className="space-y-4">
          <TextField
            label="닉네임"
            placeholder="닉네임을 입력해주세요"
            value={form.nickname}
            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
          />
          <TextField
            label="이메일"
            type="email"
            placeholder="이메일을 입력해주세요"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <TextField
            label="비밀번호"
            type="password"
            placeholder="비밀번호를 입력해주세요"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <TextField
            label="비밀번호 확인"
            type="password"
            placeholder="비밀번호를 다시 입력해주세요"
            value={form.passwordConfirm}
            onChange={(e) =>
              setForm({ ...form, passwordConfirm: e.target.value })
            }
          />

          <div className="space-y-2 pt-2">
            <AgreeBox
              checked={agreements.service}
              onToggle={() =>
                setAgreements((a) => ({ ...a, service: !a.service }))
              }
              label="[필수] 서비스 이용약관 동의"
            />
            <AgreeBox
              checked={agreements.privacy}
              onToggle={() =>
                setAgreements((a) => ({ ...a, privacy: !a.privacy }))
              }
              label="[필수] 개인정보 수집 및 이용 동의"
            />
          </div>

          <Button
            size="lg"
            fullWidth
            onClick={handleSignup}
            disabled={!canSubmit}
            className="mt-2"
          >
            가입하기
          </Button>

          <div className="relative flex items-center py-3">
            <div className="flex-1 border-t border-gray-200" />
            <span className="px-4 text-xs text-gray-400">또는</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <Button variant="outline" size="lg" fullWidth>
            <GoogleIcon />
            구글로 시작하기
          </Button>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="font-semibold text-brand-500">
            로그인
          </Link>
        </p>
      </div>
    </MobileShell>
  )
}

function AgreeBox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 py-1.5 text-left"
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded border ${
          checked
            ? 'border-brand-500 bg-brand-500 text-white'
            : 'border-gray-300 bg-white'
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className="text-sm text-gray-700">{label}</span>
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}
