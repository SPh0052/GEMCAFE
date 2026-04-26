from datetime import datetime

from pydantic import BaseModel, Field


class WatermarkEmbedData(BaseModel):
    watermarkId: str = Field(..., description="워터마크 작업 ID")
    videoUuid: str = Field(..., description="워터마크가 삽입된 영상의 콘텐츠 UUID")
    watermarkedVideoUrl: str = Field(..., description="워터마크 삽입된 영상 URL")
    version: str = Field(..., description="워터마크 버전 (알고리즘 정보 포함)")
    businessId: str = Field(..., description="사업자 ID (서버 고정값)")
    downloaderUserId: str = Field(..., description="다운로더 user_id")
    processingTime: float = Field(..., description="처리 시간 (초)")
    fps: float = Field(..., description="처리 속도 (FPS)")
    psnr: float = Field(..., description="PSNR 수치 (dB)")
    ecc: str = Field(..., description="ECC 정보")
    createdAt: datetime = Field(..., description="워터마크 생성 시각 (ISO 8601)")


class WatermarkEmbedResponse(BaseModel):
    status: int = 200
    message: str = "워터마크 삽입 성공"
    data: WatermarkEmbedData
