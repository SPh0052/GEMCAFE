from pydantic import BaseModel, Field


class DashboardSummaryData(BaseModel):
    totalEmbeds: int = Field(..., description="누적 워터마크 삽입 수")
    avgSpeed: float = Field(..., description="평균 초당 처리 속도 (영상 1초/실제 처리 시간)")
    avgBer: float = Field(..., description="평균 BER (Bit Error Rate)")
    avgPsnr: float = Field(..., description="평균 PSNR (dB)")


class DashboardSummaryResponse(BaseModel):
    status: int = 200
    message: str = "조회 성공"
    data: DashboardSummaryData


class PsnrDistributionBin(BaseModel):
    label: str = Field(..., description="구간 라벨 (예: '0~10', '40이상')")
    min: float = Field(..., description="구간 하한 (포함)")
    max: float | None = Field(
        ..., description="구간 상한 (미포함). 마지막 구간은 null (상한 없음)"
    )
    count: int = Field(..., description="해당 구간에 속하는 영상 수")


class PsnrDistributionData(BaseModel):
    bins: list[PsnrDistributionBin] = Field(
        ..., description="PSNR 구간별 영상 수 (항상 5개 bin, 고정 순서)"
    )
    totalVideos: int = Field(..., description="분포 집계에 포함된 총 고유 영상 수")


class PsnrDistributionResponse(BaseModel):
    status: int = 200
    message: str = "조회 성공"
    data: PsnrDistributionData


class AttackSuccessRateItem(BaseModel):
    attackTypeId: str = Field(..., description="공격 유형 ID (robustness_attack_type.id)")
    attackType: str = Field(..., description="공격 유형 표시명")
    passRate: float = Field(
        ..., description="통과율 (%) – BER ≤ 0.3 AND PSNR ≥ 30.0 비율, 소수 1자리"
    )
    passedCount: int = Field(..., description="통과한 영상 수")
    totalCount: int = Field(..., description="해당 공격 유형으로 평가된 고유 영상 수")


class AttackSuccessRateData(BaseModel):
    attackTypes: list[AttackSuccessRateItem] = Field(
        ...,
        description="공격 유형별 결과 (항상 7개, attackTypeId 오름차순)",
    )
    totalVideos: int = Field(
        ..., description="전체 집계에 포함된 고유 영상 수"
    )


class AttackSuccessRateResponse(BaseModel):
    status: int = 200
    message: str = "조회 성공"
    data: AttackSuccessRateData
