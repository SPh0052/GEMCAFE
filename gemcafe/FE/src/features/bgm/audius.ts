/**
 * Audius API 클라이언트 — Jamendo 대체.
 *
 * Audius 는 웹3 기반 오픈 음악 플랫폼. API 가 매우 간단:
 *   - **API key 불필요** — public read 는 완전 오픈
 *   - 모든 요청에 `app_name=gemcafe` 만 함께 보내면 됨 (analytics 용, 인증 X)
 *   - CORS 헤더가 검색 API + 스트리밍 CDN 모두 `Access-Control-Allow-Origin: *`
 *   - Rate limit 사실상 무제한 (월 2.1억 req)
 *
 * 스트리밍: `/v1/tracks/{id}/stream?app_name=...` 는 302 redirect 로 mp3 반환.
 * 브라우저가 자동으로 follow 해서 <audio src> 에 직접 박으면 그대로 재생됨.
 *
 * 라이선스: 트랙별 다양 (`license` 필드). 스트리밍 권한은 모든 트랙 보장.
 * 다운로드/재배포는 cc-* 필터 필요하지만, 본 프로젝트는 스트리밍만 → 필터 불필요.
 */

const AUDIUS_API = 'https://api.audius.co/v1'
const APP_NAME = 'gemcafe'

/** Audius 트랙 응답 — 필요한 필드만 추림 */
export interface AudiusTrack {
  id: string
  title: string
  /** 초 단위 */
  duration: number
  /** 라이선스 문자열 — "cc-by", "All rights reserved" 등. null 가능 */
  license: string | null
  /** Audius 상의 트랙 페이지 URL (앞에 https://audius.co 붙임) */
  permalink: string
  artwork?: {
    '150x150'?: string
    '480x480'?: string
    '1000x1000'?: string
  }
  user: {
    id: string
    name: string
    handle: string
  }
}

interface AudiusResponse<T> {
  data: T
}

export interface SearchTracksParams {
  /** 자유 검색어 (선택) */
  query?: string
  /** Audius 장르 (case-sensitive, hyphen). 예: "Lo-Fi", "Electronic", "Jazz", "Ambient", "Acoustic", "Pop" */
  genre?: string
  /** Audius 무드. 예: "Peaceful", "Easygoing", "Energizing", "Sentimental" */
  mood?: string
  /** 결과 개수, 최대 100. 기본 10 */
  limit?: number
  /** "relevant" | "popular" | "recent". 기본 popular */
  sort_method?: 'relevant' | 'popular' | 'recent'
}

/**
 * Audius 트랙 검색. genre + mood 조합으로 카페풍 트랙 큐레이션 가능.
 *
 * 사용 예:
 *   const tracks = await searchTracks({ genre: 'Lo-Fi', mood: 'Peaceful', limit: 8 })
 *   tracks[0].title       // → 트랙 제목
 *   tracks[0].user.name   // → 아티스트 이름 (attribution 용)
 *   getStreamUrl(tracks[0].id)  // → <audio src> 에 박을 mp3 URL
 */
export async function searchTracks(
  params: SearchTracksParams,
): Promise<AudiusTrack[]> {
  const query = new URLSearchParams({
    app_name: APP_NAME,
    limit: String(params.limit ?? 10),
    sort_method: params.sort_method ?? 'popular',
  })
  if (params.query) query.set('query', params.query)
  if (params.genre) query.set('genre', params.genre)
  if (params.mood) query.set('mood', params.mood)

  const res = await fetch(`${AUDIUS_API}/tracks/search?${query.toString()}`)
  if (!res.ok) {
    throw new Error(`Audius API ${res.status}`)
  }
  const body = (await res.json()) as AudiusResponse<AudiusTrack[]>
  return body.data
}

/**
 * 장르별 인기 트랙 (trending). 검색보다 큐레이션 품질이 좋음 — 카탈로그 상위 트랙들이 옴.
 *
 * 사용 예:
 *   const tracks = await trendingTracks({ genre: 'Lo-Fi', time: 'month', limit: 8 })
 */
export async function trendingTracks(params: {
  genre?: string
  time?: 'week' | 'month' | 'year' | 'allTime'
  limit?: number
}): Promise<AudiusTrack[]> {
  const query = new URLSearchParams({
    app_name: APP_NAME,
    limit: String(params.limit ?? 10),
    time: params.time ?? 'month',
  })
  if (params.genre) query.set('genre', params.genre)

  const res = await fetch(`${AUDIUS_API}/tracks/trending?${query.toString()}`)
  if (!res.ok) {
    throw new Error(`Audius API ${res.status}`)
  }
  const body = (await res.json()) as AudiusResponse<AudiusTrack[]>
  return body.data
}

/**
 * 트랙 ID → 스트리밍 mp3 URL.
 *
 * 이 URL 은 302 redirect 로 signed mp3 URL 을 반환하지만, 브라우저가 자동 follow.
 * <audio src={getStreamUrl(id)}> 로 그대로 사용 가능 (CORS 통과).
 */
export function getStreamUrl(trackId: string): string {
  return `${AUDIUS_API}/tracks/${trackId}/stream?app_name=${APP_NAME}`
}

/**
 * 트랙 ID → Audius 사이트의 트랙 페이지 URL. attribution 링크로 사용.
 */
export function getTrackPageUrl(track: AudiusTrack): string {
  // permalink 는 "/user-handle/track-slug" 형식 — 도메인 prefix 만 붙이면 됨
  return `https://audius.co${track.permalink}`
}
