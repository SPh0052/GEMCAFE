import { useState } from 'react'
import { Link } from 'react-router-dom'

// ⚠️ [실험 1용] 컴포넌트 바깥에 선언된 평범한 JavaScript 변수
// React는 이 변수를 관찰하지 않아요. 바뀌어도 모름.
let plainCount = 0

export default function Playground() {
  // ✅ [실험 2용] React의 특별한 변수 (useState)
  // count: 현재 값, setCount: 값을 바꾸는 함수
  const [count, setCount] = useState(0)

  // ✅ [실험 3용] 텍스트 상태
  const [text, setText] = useState('')

  // 👀 컴포넌트가 다시 그려질 때마다 콘솔에 찍힘
  // (브라우저 개발자도구 > Console 탭에서 관찰하세요)
  console.log(
    '🔄 Playground 다시 그려짐 | useState count:',
    count,
    '| plainCount:',
    plainCount,
  )

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">🧪 React 실험실</h1>
          <Link
            to="/"
            className="text-sm font-medium text-brand-500 hover:underline"
          >
            ← 홈으로
          </Link>
        </header>

        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          💡 <strong>꼭 열어두세요</strong>: 브라우저 <code>F12</code> → Console
          탭. 클릭할 때마다 로그가 찍혀요.
        </p>

        {/* ──────────────────────────────────── */}
        {/* 실험 1: 평범한 변수 (안 됨) */}
        {/* ──────────────────────────────────── */}
        <section className="rounded-2xl border-2 border-rose-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-rose-700">
            ❌ 실험 1: 평범한 변수 — 화면이 안 바뀜
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            버튼을 눌러보세요. 콘솔엔 숫자가 올라가는데{' '}
            <strong>화면은 0에서 안 움직여요</strong>.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                plainCount = plainCount + 1
                console.log('👉 plainCount 증가됨:', plainCount, '(근데 화면은?)')
              }}
              className="rounded-lg bg-rose-500 px-4 py-2 font-medium text-white hover:bg-rose-600"
            >
              plainCount + 1
            </button>
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-500">화면의 값:</span>
              <span className="text-3xl font-bold text-rose-600">
                {plainCount}
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            👉 React는 <code>plainCount</code>가 바뀐 걸 모릅니다. 그래서 다시
            그려주지 않아요.
          </p>
        </section>

        {/* ──────────────────────────────────── */}
        {/* 실험 2: useState (됨) */}
        {/* ──────────────────────────────────── */}
        <section className="rounded-2xl border-2 border-emerald-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-emerald-700">
            ✅ 실험 2: useState — 화면이 자동으로 따라감
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            이번엔 <code>setCount()</code>로 값을 바꿔요. 화면이 따라와요!
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setCount(count + 1)}
              className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-white hover:bg-emerald-600"
            >
              count + 1
            </button>
            <button
              type="button"
              onClick={() => setCount(0)}
              className="rounded-lg bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300"
            >
              리셋
            </button>
            <div className="ml-2 flex items-baseline gap-2">
              <span className="text-sm text-gray-500">화면의 값:</span>
              <span className="text-3xl font-bold text-emerald-600">
                {count}
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            👉 <code>setCount</code>를 호출하면 React가 알림을 받고{' '}
            <strong>컴포넌트를 다시 실행</strong>해서 화면을 갱신합니다.
          </p>
        </section>

        {/* ──────────────────────────────────── */}
        {/* 실험 3: 입력 미러링 */}
        {/* ──────────────────────────────────── */}
        <section className="rounded-2xl border-2 border-blue-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-blue-700">
            🪞 실험 3: 타이핑하면 실시간 반영
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            input에 글자 칠 때마다 상태가 바뀌고, 아래 미리보기가 자동으로
            따라가요.
          </p>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="여기에 아무거나 타이핑해보세요"
            className="w-full rounded-lg border border-blue-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
          <div className="mt-4 rounded-lg bg-blue-50 p-4">
            <div className="text-xs text-blue-600">입력한 값 (실시간):</div>
            <div className="mt-1 text-lg font-bold text-blue-800">
              {text || <span className="text-blue-300">(비어있음)</span>}
            </div>
            <div className="mt-2 text-xs text-blue-600">
              글자 수: <strong>{text.length}</strong>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            👉 한 글자 칠 때마다 <code>onChange</code>가 호출 →{' '}
            <code>setText</code> → 화면 갱신. 모든 키 입력마다 컴포넌트가 다시
            실행돼요!
          </p>
        </section>

        {/* ──────────────────────────────────── */}
        {/* 실험 4: 숨겨진 진실 */}
        {/* ──────────────────────────────────── */}
        <section className="rounded-2xl border-2 border-purple-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-purple-700">
            🔮 보너스: "실험 1은 진짜로 숫자가 올라가고 있을까?"
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            실험 1의 빨간 버튼을 3번 정도 누르고, 그 다음 실험 2의 초록 버튼을
            한 번 눌러보세요. 마법이 일어납니다.
          </p>
          <div className="rounded-lg bg-purple-50 p-4 text-sm text-purple-800">
            <strong>왜 그럴까요?</strong>
            <br />
            실험 2 버튼을 누르면 <code>setCount</code> 때문에 컴포넌트가 다시
            그려지는데, 그때{' '}
            <span className="font-semibold">
              실험 1의 최신 plainCount 값도 화면에 반영됨
            </span>
            . → 즉 값은 계속 쌓이고 있었는데 화면이 안 바뀌었을 뿐이에요.
          </div>
        </section>
      </div>
    </div>
  )
}
