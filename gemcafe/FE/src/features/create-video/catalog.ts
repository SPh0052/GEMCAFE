/**
 * Catalog — AI 가 SSOT (Single Source of Truth) 로 정의한 시뮬레이션·배경·요소 목록.
 *
 * 향후 GET /catalog API 로 fetch 하거나 build-time 에 fetch 해 번들에 내장 가능.
 * 지금은 가이드 문서에 명시된 값들을 그대로 상수로 박아둠.
 *
 * BE 요청 시 key 를 그대로 사용 (예: simulationCode: "smash").
 */

const ASSET = (file: string) => `${import.meta.env.BASE_URL}${file}`

export interface SimulationItem {
  key: string
  label_kr: string
  image?: string
  /** 이 시뮬레이션이 적용 가능한 focus 키 목록 */
  applicable_focus: string[]
}

export interface BackgroundItem {
  key: string
  label_kr: string
  image?: string
}

export interface FocusItem {
  key: string
  label_kr: string
  /** 이 focus 선택 시 사용 가능한 시뮬레이션 키 목록 */
  applicable_simulations: string[]
}

// 가이드 문서 기준 6종 시뮬레이션. 카드 이미지는 기존 FE 자산으로 best-effort 매핑.
export const SIMULATIONS: SimulationItem[] = [
  {
    key: 'smash',
    label_kr: '뭉개기',
    image: ASSET('flow.png'),
    applicable_focus: ['sponge', 'whipped_cream'],
  },
  {
    key: 'fork_bite',
    label_kr: '포크로 한입',
    image: ASSET('chop.png'),
    applicable_focus: ['sponge', 'whipped_cream'],
  },
  {
    key: 'cut_in_half',
    label_kr: '반으로 가르기',
    image: ASSET('divine.png'),
    applicable_focus: ['sponge', 'whipped_cream'],
  },
  {
    key: 'cream_scoop',
    label_kr: '크림 떠올리기',
    image: ASSET('flow.png'),
    applicable_focus: ['whipped_cream'],
  },
  {
    key: 'topping_fall',
    label_kr: '위에서 떨어뜨리기',
    image: ASSET('chop.png'),
    applicable_focus: ['strawberry', 'blueberry', 'mango'],
  },
]

// 가이드 문서 기준 6종 배경.
export const BACKGROUNDS: BackgroundItem[] = [
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

// 요소(focus) — 3종 고정. AI 의 suggested_focus 는 별개의 참고 정보.
export const FOCUSES: FocusItem[] = [
  {
    key: 'sponge',
    label_kr: '시트',
    applicable_simulations: ['smash', 'fork_bite', 'cut_in_half'],
  },
  {
    key: 'strawberry',
    label_kr: '딸기',
    applicable_simulations: ['topping_fall'],
  },
  {
    key: 'whipped_cream',
    label_kr: '크림',
    applicable_simulations: [
      'smash',
      'fork_bite',
      'cut_in_half',
      'cream_scoop',
    ],
  },
]

/** 선택된 focus 에 적용 가능한 시뮬레이션만 필터링 */
export function simulationsForFocus(focusKey: string | null): SimulationItem[] {
  if (!focusKey) return []
  const focus = FOCUSES.find((f) => f.key === focusKey)
  if (!focus) return []
  return SIMULATIONS.filter((s) => focus.applicable_simulations.includes(s.key))
}
