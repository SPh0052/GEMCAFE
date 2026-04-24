import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, UtensilsCrossed } from 'lucide-react'
import MobileShell from '@/shared/components/MobileShell'
import Button from '@/shared/components/Button'
import TextField from '@/shared/components/TextField'
import { useAuthStore } from '@/shared/stores/useAuthStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = () => {
    // TODO: 실제 서버 로그인 — 지금은 mock
    login({
      nickname: '엄송현 사장',
      email: email || 'gemma.kim@example.com',
      gem: 45000,
    })
    navigate('/')
  }

  return (
    <MobileShell>
      <div className="flex flex-1 flex-col justify-center px-6 py-10">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-7 w-7 text-brand-500" />
            <span className="text-3xl font-bold">
              <span className="text-brand-500">gem</span>.cafe
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            다시 오신 것을 환영합니다
          </p>
        </div>

        <div className="space-y-4">
          <TextField
            label="이메일"
            type="email"
            placeholder="name@example.com"
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextField
            label="비밀번호"
            type="password"
            placeholder="••••••••"
            icon={<Lock className="h-4 w-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            rightSlot={
              <a
                href="#"
                className="text-xs font-medium text-brand-500 hover:underline"
              >
                비밀번호 찾기
              </a>
            }
          />

          <Button size="lg" fullWidth onClick={handleLogin}>
            로그인
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
          계정이 없으신가요?{' '}
          <Link to="/signup" className="font-semibold text-brand-500">
            회원가입
          </Link>
        </p>
      </div>
    </MobileShell>
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
