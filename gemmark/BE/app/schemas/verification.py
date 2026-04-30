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


class VerificationDetailData(BaseModel):
    id: int = Field(..., description="검증 이력 ID")
    status: str = Field(..., description="검출 상태")
    accuracy: float = Field(..., description="정확도 (%)")
    extractDuration: float = Field(..., description="추출 처리 시간 (초)")
    createdAt: datetime = Field(..., description="검증 요청 시각")

    videoWatermarkedId: int = Field(..., description="대상 워터마크 영상 ID")
    originalFileName: str = Field(..., description="원본 파일명")
    storedFileName: str = Field(..., description="저장 파일명")
    thumbnailUrl: str | None = Field(None, description="썸네일 URL")
    fileType: str = Field(..., description="파일 타입")
    fileSize: int = Field(..., description="파일 크기 (bytes)")
    durationSec: float = Field(..., description="영상 길이 (초)")
    embedPsnr: float = Field(..., description="삽입 PSNR (dB)")
    alpha: int = Field(..., description="alpha 값")
    watermarkHex: str = Field(..., description="워터마크 페이로드 HEX")
    contentUuid: str = Field(..., description="콘텐츠 UUID")
    embedProcessingTime: float | None = Field(None, description="삽입 처리 시간 (초)")
    embedProcessingFps: float | None = Field(None, description="삽입 처리 FPS")
    embeddedAt: datetime = Field(..., description="워터마크 삽입 시각")

    businessId: str = Field(..., description="사업자 ID")
    payloadBits: int = Field(..., description="페이로드 비트 수")


class VerificationDetailResponse(BaseModel):
    status: int = 200
    message: str = "워터마크 검증 이력 상세 조회 성공"
    data: VerificationDetailData
