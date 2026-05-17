/**
 * 카페 BGM 카테고리 → Audius 장르/무드 매핑.
 *
 * Audius 의 공식 장르 (case-sensitive, hyphen 표기):
 *   Electronic, Rock, Pop, Hip-Hop/Rap, Acoustic, Folk, Ambient, Jazz,
 *   Lo-Fi, Classical, R&B/Soul, Country, Latin, ...
 *
 * 무드 (선택):
 *   Peaceful, Easygoing, Sentimental, Energizing, Aggressive, Empowering 등
 */

export const BGM_CATEGORIES = [
  '밝음',
  '잔잔',
  '로파이',
  '어쿠스틱',
  '재즈',
] as const

export type BgmCategory = (typeof BGM_CATEGORIES)[number]

export interface CategoryQuery {
  genre: string
  /** 검색 결과 더 좁히고 싶을 때 추가 (선택) */
  mood?: string
}

export const CATEGORY_QUERIES: Record<BgmCategory, CategoryQuery> = {
  밝음: { genre: 'Pop', mood: 'Energizing' },
  잔잔: { genre: 'Ambient', mood: 'Peaceful' },
  로파이: { genre: 'Lo-Fi', mood: 'Peaceful' },
  어쿠스틱: { genre: 'Acoustic', mood: 'Easygoing' },
  재즈: { genre: 'Jazz', mood: 'Easygoing' },
}

export const TRACKS_PER_CATEGORY = 8
