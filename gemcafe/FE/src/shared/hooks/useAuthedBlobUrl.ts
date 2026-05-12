import { useEffect, useState } from 'react'
import { api } from '@/shared/lib/axios'

/**
 * 인증이 필요한 미디어 URL 을 blob URL 로 변환해주는 훅.
 *
 * BE 의 /dev/files/gemcafe/{filename} 등 파일 서빙 엔드포인트는 Authorization
 * 헤더 검증을 요구하므로 `<img src>` / `<video src>` 에 직접 박으면 401 이 떨어진다.
 *
 * 사용법:
 *   const { blobUrl, loading, error } = useAuthedBlobUrl('/dev/files/gemcafe/abc.mp4')
 *   if (blobUrl) return <video src={blobUrl} controls />
 *
 * path 인자 처리:
 *   - 'https://...' / 'http://...'  → axios 가 그대로 사용
 *   - '/dev/files/...' / '/dev/be/...' → origin 기준 (api baseURL 우회). Vite proxy 가 routing.
 *   - 그 외 ('/cakes/analyze' 등)    → api baseURL(`/dev/be/gemcafe/api/v1`) 에 prepend
 *
 * 401 → refresh → 재시도 흐름은 axios 인터셉터가 알아서 처리.
 *
 * cleanup:
 *   - 언마운트 / path 변경 시 이전 blob URL 자동 revoke (메모리 누수 방지)
 */
export function useAuthedBlobUrl(path: string | undefined | null) {
  const [blobUrl, setBlobUrl] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!path) {
      setBlobUrl(undefined)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    let created: string | undefined
    setLoading(true)
    setError(null)

    // /dev/files/... 같은 origin-relative 경로는 api baseURL 과 별개 — baseURL 비움.
    const useOriginBase = /^\/dev\//.test(path)

    api
      .get<Blob>(path, {
        responseType: 'blob',
        ...(useOriginBase ? { baseURL: '' } : {}),
      })
      .then((res) => {
        if (cancelled) return
        created = URL.createObjectURL(res.data)
        setBlobUrl(created)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[useAuthedBlobUrl] failed:', path, err)
        setError(err instanceof Error ? err : new Error(String(err)))
        setBlobUrl(undefined)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [path])

  return { blobUrl, loading, error }
}
