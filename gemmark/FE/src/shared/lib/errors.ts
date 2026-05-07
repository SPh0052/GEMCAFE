import axios from 'axios'

/**
 * axios 에러에서 백엔드가 보낸 message 를 안전하게 추출.
 * 추출 실패 시 fallback 문자열 반환.
 *
 * 사용 예:
 *   .catch((err) => {
 *     setError(extractErrorMessage(err, '데이터를 불러오지 못했습니다.'))
 *   })
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as unknown
    if (data && typeof data === 'object' && 'message' in data) {
      const msg = (data as { message?: unknown }).message
      if (typeof msg === 'string' && msg) return msg
    }
  }
  return fallback
}
