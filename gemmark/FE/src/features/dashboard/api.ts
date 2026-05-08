import { api } from '@/shared/lib/axios'

interface ApiResponse<T> {
  status: number
  message: string
  data: T
}

/**
 * 대시보드 요약 정보.
 *
 * GET /api/v1/dashboard/summary 응답 예:
 *   {
 *     status: 200,
 *     message: "조회 성공",
 *     data: {
 *       totalEmbeds: 12847,   // 누적 워터마크 영상 수
 *       avgSpeed: 12.4,       // 평균 삽입 처리 시간 (초)
 *       avgBer: 2.1,          // 강건성 평균 BER (%)
 *       avgPsnr: 39.8         // 강건성 평균 PSNR (dB)
 *     }
 *   }
 */
export interface DashboardSummary {
  totalEmbeds: number
  avgSpeed: number
  avgBer: number
  avgPsnr: number
}

/**
 * 대시보드 요약 정보 조회.
 * GET /api/v1/dashboard/summary
 *
 * authorization 헤더는 axios 요청 인터셉터가 자동 첨부.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const res = await api.get<ApiResponse<DashboardSummary>>('/dashboard/summary')
  return res.data.data
}

// ─── PSNR 분포별 영상 수 ────────────────────────────────────────
export interface PsnrBin {
  label: string
  min: number
  max: number
  count: number
}
export interface PsnrDistribution {
  bins: PsnrBin[]
  totalVideos: number
}

/**
 * PSNR 분포별 영상 수 조회.
 * GET /api/v1/dashboard/psnr-distribution
 */
export async function getPsnrDistribution(): Promise<PsnrDistribution> {
  const res = await api.get<ApiResponse<PsnrDistribution>>(
    '/dashboard/psnr-distribution',
  )
  return res.data.data
}

// ─── 공격 유형별 통과율 ─────────────────────────────────────────
export interface AttackTypeStat {
  attackTypeId: string
  attackType: string
  passRate: number
  passedCount: number
  totalCount: number
}
export interface AttackSuccessRate {
  attackTypes: AttackTypeStat[]
  totalVideos: number
}

/**
 * 강건성 공격 유형별 통과율 조회.
 * GET /api/v1/dashboard/attack-success-rate
 */
export async function getAttackSuccessRate(): Promise<AttackSuccessRate> {
  const res = await api.get<ApiResponse<AttackSuccessRate>>(
    '/dashboard/attack-success-rate',
  )
  return res.data.data
}
