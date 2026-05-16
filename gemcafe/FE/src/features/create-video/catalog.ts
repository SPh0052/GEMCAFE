/**
 * Catalog — AI 시뮬레이션·배경 카탈로그 + 분석 결과 키워드 → 시뮬레이션 매핑.
 *
 * 강조 포인트는 더 이상 하드코딩 (시트·딸기·크림) 이 아니라 analyze API 가
 * 내려준 base / creams / toppings / coating 의 키워드를 그대로 칩으로 노출.
 * 키워드가 어느 카테고리에서 왔는지에 따라 다른 시뮬레이션이 활성화된다.
 */

const ASSET = (file: string) => `${import.meta.env.BASE_URL}${file}`

export interface SimulationItem {
  key: string
  label_kr: string
  image?: string
}

export interface BackgroundItem {
  key: string
  label_kr: string
  image?: string
}

/** Cake analysis 응답 안의 카테고리 필드 이름. */
export type FocusCategory = 'base' | 'creams' | 'toppings' | 'coating'

// 시뮬레이션 정의 — 카테고리 매핑은 별도.
export const SIMULATIONS: SimulationItem[] = [
  { key: 'spoon', label_kr: '한 조각 쏙 들어올리기', image: ASSET('flow.png') },
  { key: 'fork_bite', label_kr: '포크로 한입 뜨기', image: ASSET('chop.png') },
  { key: 'cut_in_half', label_kr: '칼로 단면 가르기', image: ASSET('knife.png') },

  { key: 'hand_half', label_kr: '손으로 반 가르기', image: ASSET('divine.png') },
  { key: 'cream_scoop', label_kr: '한 스푼 떠내기', image: ASSET('spoons.png') },
  { key: 'smash', label_kr: '뭉개기', image: ASSET('smash.png') },

  { key: 'topping_drop', label_kr: '위에서 떨어트리기', image: ASSET('drop.png') },

  { key: 'glazed_effect', label_kr: '글레이즈드 효과', image: ASSET('glaze.png') },
]

/** 카테고리별 사용 가능한 시뮬레이션 키 집합. */
const CATEGORY_SIMULATIONS: Record<FocusCategory, string[]> = {
  // 베이스 (시트류) — 기존 시트와 동일
  base: ['spoon', 'fork_bite', 'cut_in_half'],
  // 크림류 — 기존 크림과 동일
  creams: ['hand_half','cream_scoop','smash'],
  // 토핑류 — 토핑 떨어트리기 단일
  toppings: ['topping_drop'],
  // 코팅류 — 글레이즈드 효과 단일
  coating: ['glazed_effect'],
}

/** 선택된 카테고리에 적용 가능한 시뮬레이션만 필터링. */
export function simulationsForCategory(
  category: FocusCategory | null,
): SimulationItem[] {
  if (!category) return []
  const keys = CATEGORY_SIMULATIONS[category]
  return SIMULATIONS.filter((s) => keys.includes(s.key))
}

// 배경 — "미선택" 포함 (선택 시 API 에 null 전송).
export const BACKGROUNDS: BackgroundItem[] = [
  { key: 'none', label_kr: '미선택' },
  { key: 'white_marble', label_kr: '흰 대리석', image: ASSET('home.png') },
  {
    key: 'cafe_interior',
    label_kr: '카페 인테리어',
    image: ASSET('hanok.png'),
  },
  { key: 'outdoor', label_kr: '야외 정원', image: ASSET('picnic.png') },
  { key: 'wooden_table', label_kr: '원목 테이블', image: ASSET('wood.png') },
  {
    key: 'minimalist_white',
    label_kr: '미니멀 화이트',
    image: ASSET('office.png'),
  },
  { key: 'dark_moody', label_kr: '어두운 무드', image: ASSET('retro.png') },
]

/**
 * 분석 결과로 받은 영문 키워드 → 한글 라벨 매핑.
 * 알려진 키는 매핑 표 적용, 모르는 키는 underscore 제거 + title case 폴백.
 */
const KEYWORD_LABELS: Record<string, string> = {
  // base
  baked_cheese: '베이크드 치즈',
  sponge: '스펀지 시트',
  chiffon: '시폰 시트',
  genoise: '제누와즈',
  biscuit: '비스킷',
  brownie: '브라우니',
  // creams
  whipped: '휘핑 크림',
  whipped_cream: '휘핑 크림',
  buttercream: '버터 크림',
  custard: '커스터드',
  ganache: '가나슈',
  mascarpone: '마스카포네',
  cream_cheese: '크림치즈',
  // toppings
  strawberry: '딸기',
  blueberry: '블루베리',
  raspberry: '라즈베리',
  chocolate: '초콜릿',
  chocolate_chips: '초코칩',
  nuts: '견과류',
  fruit: '과일',
  mint: '민트',
  edible_flower: '식용 꽃',
  // coating
  glazed: '글레이즈드',
  chocolate_coating: '초콜릿 코팅',
  caramelized_top: '캐러멜 탑',
  creamy_interior: '크리미한 내부',
  sugar_dust: '슈가 파우더',
}

export function keywordLabel(keyword: string): string {
  const known = KEYWORD_LABELS[keyword]
  if (known) return known
  // underscore → space, 각 단어 첫 글자 대문자
  return keyword
    .split('_')
    .map((w) => (w.length === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

/**
 * 분석 응답 안에서 주어진 키워드가 어느 카테고리에 속하는지 추론.
 * 세션 복원 시 selections.focus 만 들고 와서 카테고리를 알아내야 할 때 사용.
 */
export function categoryForKeyword(
  keyword: string,
  analysis: {
    base?: string[]
    creams?: string[]
    toppings?: string[]
    coating?: string
  } | null | undefined,
): FocusCategory | null {
  if (!analysis) return null
  if (analysis.base?.includes(keyword)) return 'base'
  if (analysis.creams?.includes(keyword)) return 'creams'
  if (analysis.toppings?.includes(keyword)) return 'toppings'
  if (analysis.coating && analysis.coating === keyword) return 'coating'
  return null
}
