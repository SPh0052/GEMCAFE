from datetime import datetime

from pydantic import BaseModel, Field


class VerificationListItem(BaseModel):
    id: int = Field(..., description="검증 이력 ID")
    videoWatermarkedId: int = Field(..., description="대상 워터마크 영상 ID")
    status: str = Field(..., description="검출 상태 (DETECTED/NOT_DETECTED/PROCESSING)")
    originalFileName: str = Field(..., description="원본 파일명")
    fileSize: int = Field(..., description="파일 크기 (bytes)")
    durationSec: float = Field(..., description="영상 길이 (초)")
    thumbnailUrl: str | None = Field(None, description="썸네일 URL")
    createdAt: datetime = Field(..., description="검증 요청 시각")


class VerificationListData(BaseModel):
    items: list[VerificationListItem]
    total: int
    page: int
    size: int


class VerificationListResponse(BaseModel):
    status: int = 200
    message: str = "워터마크 검증 이력 목록 조회 성공"
    data: VerificationListData
