/**
 * Catalog - AI simulation/background catalog + analysis keyword mapping.
 *
 * Focus chips are driven by analyze API values rather than a fixed FE list.
 * The keyword category controls which simulations are available.
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

/** Cake analysis response category field names. */
export type FocusCategory = 'base' | 'creams' | 'toppings' | 'coating'

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

/** Available simulation keys by analysis category. */
const CATEGORY_SIMULATIONS: Record<FocusCategory, string[]> = {
  base: ['spoon', 'fork_bite', 'cut_in_half'],
  creams: ['hand_half', 'cream_scoop', 'smash'],
  toppings: ['topping_drop'],
  coating: ['glazed_effect'],
}

export function simulationsForCategory(
  category: FocusCategory | null,
): SimulationItem[] {
  if (!category) return []
  const keys = CATEGORY_SIMULATIONS[category]
  return SIMULATIONS.filter((s) => keys.includes(s.key))
}

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

const KEYWORD_LABELS: Record<string, string> = {
  baked_cheese: '베이크드 치즈',
  sponge: '스펀지 시트',
  chiffon: '시폰 시트',
  genoise: '제누와즈',
  biscuit: '비스킷',
  brownie: '브라우니',
  whipped: '휘핑 크림',
  whipped_cream: '휘핑 크림',
  buttercream: '버터 크림',
  custard: '커스터드',
  ganache: '가나슈',
  mascarpone: '마스카포네',
  cream_cheese: '크림치즈',
  strawberry: '딸기',
  blueberry: '블루베리',
  raspberry: '라즈베리',
  chocolate: '초콜릿',
  chocolate_chips: '초코칩',
  nuts: '견과류',
  fruit: '과일',
  mint: '민트',
  edible_flower: '식용 꽃',
  glazed: '글레이즈드',
  chocolate_coating: '초콜릿 코팅',
  caramelized_top: '캐러멜 탑',
  creamy_interior: '크리미한 내부',
  sugar_dust: '슈가 파우더',
}

export function keywordLabel(keyword: string): string {
  const known = KEYWORD_LABELS[keyword]
  if (known) return known
  return keyword
    .split('_')
    .map((w) => (w.length === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

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
