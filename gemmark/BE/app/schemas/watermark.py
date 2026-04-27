from datetime import datetime

from pydantic import BaseModel, Field


class WatermarkEmbedData(BaseModel):
    success: bool = Field(..., description="성공 여부")
    processingTime: float = Field(..., description="처리 시간 (초)")
    psnr: float = Field(..., description="삽입 PSNR (dB)")
    watermarkHex: str = Field(..., description="워터마크 페이로드 HEX")
    contentUuid: str = Field(..., description="콘텐츠 UUID")
    timestamp: datetime = Field(..., description="타임스탬프 (ISO 8601)")


class WatermarkEmbedResponse(BaseModel):
    status: int = 200
    message: str = "워터마크 삽입 성공"
    data: WatermarkEmbedData


class WatermarkVerifyData(BaseModel):
    isWatermarked: bool = Field(..., description="워터마크 존재 여부")
    videoUuid: str | None = Field(None, description="감지된 영상 UUID")
    businessId: str | None = Field(None, description="사업자 ID")
    createdAt: datetime | None = Field(None, description="원본 생성 시각 (ISO-8601)")
    ber: float | None = Field(None, description="Bit Error Rate")


class WatermarkVerifyResponse(BaseModel):
    status: int = 200
    message: str = "검증 완료"
    data: WatermarkVerifyData
