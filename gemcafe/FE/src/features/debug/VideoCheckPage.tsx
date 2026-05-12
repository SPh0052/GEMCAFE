import { useState } from 'react'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { api } from '@/shared/lib/axios'

/**
 * BE 파일 서빙 동작 검증용 디버그 페이지.
 * /api/v1/videos/{id} 와 /api/v1/files/videos/{id} 응답을 검사해
 * Content-Type/Length/Magic Bytes 까지 시각화.
 *
 * 사용법: 로그인된 상태에서 /debug/video-check 진입 → videoId 입력 → 실행
 */

type CheckStatus = 'idle' | 'running' | 'pass' | 'fail'

interface CheckResult {
  name: string
  status: CheckStatus
  message?: string
  details?: Record<string, string | number | boolean | undefined>
}

export default function VideoCheckPage() {
  const [videoId, setVideoId] = useState('6')
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<CheckResult[]>([])

  const update = (idx: number, patch: Partial<CheckResult>) =>
    setResults((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    )

  const run = async () => {
    if (running) return
    const id = Number(videoId)
    if (!Number.isInteger(id) || id <= 0) {
      setResults([
        { name: 'Input', status: 'fail', message: '유효한 videoId 가 아닙니다.' },
      ])
      return
    }

    const initial: CheckResult[] = [
      { name: '1. GET /api/v1/videos/{id} — 상세 JSON', status: 'running' },
      { name: '2. GET videoUrl — 영상 파일 서빙', status: 'idle' },
      { name: '3. GET thumbnailUrl — 썸네일 서빙', status: 'idle' },
    ]
    setResults(initial)
    setRunning(true)

    let videoUrl: string | undefined
    let thumbnailUrl: string | undefined

    // ── Check 1: 상세 JSON ─────────────────────────────
    try {
      const res = await api.get(`/videos/${id}`)
      const data = res.data?.data
      videoUrl = data?.videoUrl
      thumbnailUrl = data?.thumbnailUrl
      const ok =
        typeof data?.videoId === 'number' &&
        typeof data?.videoUrl === 'string' &&
        typeof data?.thumbnailUrl === 'string' &&
        typeof data?.title === 'string'
      update(0, {
        status: ok ? 'pass' : 'fail',
        message: ok ? 'JSON 응답 정상' : '응답 필드 누락',
        details: {
          status: res.status,
          'Content-Type': res.headers['content-type'],
          videoId: data?.videoId,
          title: data?.title,
          videoUrl: data?.videoUrl,
          thumbnailUrl: data?.thumbnailUrl,
        },
      })
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined
      update(0, {
        status: 'fail',
        message: `요청 실패 (status: ${status ?? 'network'})`,
        details: {
          error: err instanceof Error ? err.message : String(err),
        },
      })
      setRunning(false)
      return
    }

    // ── Check 2: video file ─────────────────────────────
    update(1, { status: 'running' })
    if (videoUrl) {
      const r = await fetchAndInspect(videoUrl, 'video')
      update(1, r)
    } else {
      update(1, { status: 'fail', message: 'videoUrl 없음' })
    }

    // ── Check 3: thumbnail ──────────────────────────────
    update(2, { status: 'running' })
    if (thumbnailUrl) {
      const r = await fetchAndInspect(thumbnailUrl, 'image')
      update(2, r)
    } else {
      update(2, { status: 'fail', message: 'thumbnailUrl 없음' })
    }

    setRunning(false)
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="text-2xl font-bold">영상 서빙 점검</h1>
      <p className="mt-1 text-sm text-gray-500">
        BE 의 /api/v1/videos/&#123;id&#125; 와 파일 서빙이 기대한 형태로 응답하는지 확인합니다.
      </p>

      <div className="mt-6 flex items-center gap-2">
        <label className="text-sm font-medium">videoId</label>
        <input
          type="number"
          value={videoId}
          onChange={(e) => setVideoId(e.target.value)}
          className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          {running && <Loader2 className="h-4 w-4 animate-spin" />}
          {running ? '실행 중...' : '실행'}
        </button>
      </div>

      <ol className="mt-8 space-y-4">
        {results.map((r, i) => (
          <ResultCard key={i} result={r} />
        ))}
      </ol>
    </div>
  )
}

function ResultCard({ result }: { result: CheckResult }) {
  const tone =
    result.status === 'pass'
      ? 'border-emerald-200 bg-emerald-50'
      : result.status === 'fail'
        ? 'border-rose-200 bg-rose-50'
        : result.status === 'running'
          ? 'border-blue-200 bg-blue-50'
          : 'border-gray-200 bg-white'

  const icon =
    result.status === 'pass'
      ? '✅'
      : result.status === 'fail'
        ? '❌'
        : result.status === 'running'
          ? '⏳'
          : '⚪'

  return (
    <li className={`rounded-2xl border p-5 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-bold text-gray-900">
          {icon} {result.name}
        </h2>
      </div>
      {result.message && (
        <p className="mt-2 text-sm text-gray-700">{result.message}</p>
      )}
      {result.details && (
        <pre className="mt-3 overflow-x-auto rounded-lg bg-white/80 p-3 text-xs leading-relaxed text-gray-700 ring-1 ring-gray-200">
          {Object.entries(result.details)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n')}
        </pre>
      )}
    </li>
  )
}

/**
 * 보호된 파일 URL 을 blob 으로 받아 검사.
 * - HTTP status / Content-Type / Content-Length
 * - 첫 16 바이트 hex (매직 바이트로 실제 포맷 추정)
 * - 기대 타입과 일치하는지 자동 판정
 */
async function fetchAndInspect(
  url: string,
  expect: 'video' | 'image',
): Promise<CheckResult> {
  try {
    const res = await api.get<Blob>(url, { responseType: 'blob' })
    const blob = res.data
    const contentType = res.headers['content-type'] as string | undefined
    const contentLength = res.headers['content-length'] as string | undefined
    const head = await readFirstBytes(blob, 16)
    const magic = detectMagic(head)

    const expectedMime = expect === 'video' ? /^video\//i : /^image\//i
    const mimeOK = !!contentType && expectedMime.test(contentType)
    const magicOK =
      expect === 'video'
        ? magic.startsWith('mp4') ||
          magic.startsWith('webm') ||
          magic.startsWith('mov')
        : magic.startsWith('jpeg') ||
          magic.startsWith('png') ||
          magic.startsWith('gif') ||
          magic.startsWith('webp')
    const looksLikeHTML = magic === 'html'

    let status: CheckStatus
    let message: string
    if (looksLikeHTML) {
      status = 'fail'
      message =
        'BE 가 HTML 을 응답함 — 파일 서빙 라우팅 또는 컨트롤러 배포 누락 가능성.'
    } else if (mimeOK && magicOK) {
      status = 'pass'
      message = `정상 (${expect === 'video' ? '영상' : '이미지'} 응답 확인됨)`
    } else if (mimeOK && !magicOK) {
      status = 'fail'
      message =
        'Content-Type 은 맞지만 실제 바이트가 다른 포맷. 데이터 깨짐 의심.'
    } else {
      status = 'fail'
      message = '기대한 Content-Type 이 아님.'
    }

    return {
      name: '',
      status,
      message,
      details: {
        'HTTP Status': res.status,
        'Content-Type': contentType,
        'Content-Length': contentLength ?? blob.size,
        'Blob size (bytes)': blob.size,
        'First 16 bytes (hex)': bytesToHex(head),
        'Magic detected': magic,
      },
    }
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined
    return {
      name: '',
      status: 'fail',
      message: `요청 실패 (status: ${status ?? 'network'})`,
      details: {
        url,
        error: err instanceof Error ? err.message : String(err),
      },
    }
  }
}

async function readFirstBytes(blob: Blob, n: number): Promise<Uint8Array> {
  const slice = blob.slice(0, n)
  const buf = await slice.arrayBuffer()
  return new Uint8Array(buf)
}

function bytesToHex(b: Uint8Array): string {
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, '0'))
    .join(' ')
}

/**
 * 첫 바이트로 실제 포맷 추정. (Content-Type 안 믿고 백업 검증)
 *  - mp4: ....ftyp        (offset 4-7 = 'ftyp')
 *  - jpeg: ff d8 ff
 *  - png: 89 50 4e 47
 *  - gif: 47 49 46 38
 *  - webp: 'RIFF' .... 'WEBP'
 *  - webm: 1a 45 df a3
 *  - html: 3c (= '<')
 */
function detectMagic(b: Uint8Array): string {
  if (b.length < 4) return 'unknown'
  const ascii = (i: number, len: number) =>
    String.fromCharCode(...b.slice(i, i + len))
  // MP4
  if (b.length >= 8 && ascii(4, 4) === 'ftyp') return 'mp4'
  // JPEG
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg'
  // PNG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return 'png'
  // GIF
  if (ascii(0, 4) === 'GIF8') return 'gif'
  // WEBP
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP')
    return 'webp'
  // WEBM/Matroska
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3)
    return 'webm'
  // QuickTime MOV (often has 'moov' or 'mdat' atom)
  if (b.length >= 8 && (ascii(4, 4) === 'moov' || ascii(4, 4) === 'mdat'))
    return 'mov'
  // HTML
  const head = ascii(0, Math.min(b.length, 5)).toLowerCase()
  if (head.startsWith('<')) return 'html'
  return 'unknown'
}
