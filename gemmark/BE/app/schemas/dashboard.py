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
