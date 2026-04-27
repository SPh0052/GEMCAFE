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
