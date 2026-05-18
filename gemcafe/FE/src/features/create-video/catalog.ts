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
  { key: 'lift_slice', label_kr: '한 조각 쏙 들어올리기', image: ASSET('flow.png') },
  { key: 'fork_bite', label_kr: '포크로 한입 뜨기', image: ASSET('chop.png') },
  { key: 'cut_in_half', label_kr: '칼로 단면 가르기', image: ASSET('knife.png') },
  { key: 'cream_scoop', label_kr: '한 스푼 떠내기', image: ASSET('spoons.png') },
  { key: 'smash', label_kr: '뭉개기', image: ASSET('smash.png') },
  { key: 'hand_split', label_kr: '손으로 반 가르기', image: ASSET('divine.png') },
  { key: 'topping_fall', label_kr: '위에서 떨어트리기', image: ASSET('drop.png') },
]

/** Available simulation keys by analysis category. */
const CATEGORY_SIMULATIONS: Record<FocusCategory, string[]> = {
  base: ['fork_bite', 'cut_in_half', 'lift_slice'],
  creams: ['cream_scoop', 'smash', 'hand_split'],
  toppings: ['topping_fall'],
  coating: [],
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
  vanilla_sponge: '바닐라 시트',
  chocolate_sponge: '초콜릿 시트',
  ladyfinger_biscuit: '레이디핑거 비스킷',
  chiffon: '시폰 시트',
  genoise: '제누와즈',
  biscuit: '비스킷',
  brownie: '브라우니',
  whipped: '휘핑 크림',
  whipped_cream: '휘핑 크림',
  whipped_cream_coating: '휘핑 크림 코팅',
  buttercream: '버터 크림',
  custard: '커스터드',
  ganache: '가나슈',
  molten_chocolate: '녹아내리는 초콜릿',
  mascarpone: '마스카포네',
  mascarpone_cream: '마스카포네 크림',
  cream_cheese: '크림치즈',
  cream: '크림',
  strawberry: '딸기',
  fresh_strawberries: '신선한 딸기',
  blueberry: '블루베리',
  raspberry: '라즈베리',
  powdered_sugar: '슈가 파우더',
  cocoa_powder: '코코아 가루',
  fruit: '과일',
  mint: '민트',
  mousse: '무스',
  edible_flower: '식용 꽃',
  glazed: '글레이즈드',
  mirror_glaze: '미러 글레이즈',
  chocolate_coating: '초콜릿 코팅',
  caramelized_top: '캐러멜 탑',
  creamy_interior: '크리미한 내부',
  dense_interior: '탄탄한 내부',
  soft_sponge_layers: '말랑한 시트층',
  smooth_cream_layers: '부드러운 크림층',
  fluffy_whipped_cream: '보송한 생크림',
  warm_steam: '따뜻한 김',
  rich_chocolate: '진한 초콜릿',
  cocoa_dusting: '코코아 가루',
  mascarpone_texture: '마스카포네 질감',
  coffee_soaked_layers: '커피에 젖은 시트층',
  stabilized_cream: '단단하게 잡힌 크림',
  piped_rosettes: '파이핑 로제트',
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

/**
 * Normalize legacy simulation keys to current catalog keys.
 * Add aliases here when FE has older persisted values.
 */
export function normalizeSimulationCode(code: string | null | undefined): string | null {
  if (code == null) return null
  const map: Record<string, string> = {
    // legacy -> current
    topping_drop: 'topping_fall',
    strawberry_fall: 'topping_fall',
    strawberry_cascade: 'topping_fall',
  }
  return map[code] ?? code
}
