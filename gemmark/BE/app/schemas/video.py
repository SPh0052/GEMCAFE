from datetime import datetime

from pydantic import BaseModel, Field


class VideoUploadData(BaseModel):
    videoId: str = Field(..., description="업로드된 영상의 ID")
    originalFilename: str = Field(..., description="원본 파일명")
    fileSize: int = Field(..., description="파일 크기 (bytes)")
    mimeType: str = Field(..., description="파일 MIME 타입")
    uploadedAt: datetime = Field(..., description="업로드 완료 시각 (ISO 8601)")


class VideoUploadResponse(BaseModel):
    status: int = 200
    message: str = "영상 파일 업로드 성공"
    data: VideoUploadData


class VideoListItem(BaseModel):
    id: int = Field(..., description="워터마크 영상 ID")
    contentUuid: str = Field(..., description="콘텐츠 UUID (상세 조회 path param)")
    name: str = Field(..., description="원본 파일명")
    type: str = Field(..., description="파일 타입 (확장자)")
    size: int = Field(..., description="파일 크기 (bytes)")
    thumbnailUrl: str | None = Field(None, description="썸네일 URL (없으면 null)")
    createdAt: datetime = Field(..., description="생성 시각 (ISO 8601)")


class VideoListData(BaseModel):
    items: list[VideoListItem]
    total: int
    page: int
    size: int


class VideoListResponse(BaseModel):
    status: int = 200
    message: str = "워터마크 삽입 영상 목록 조회 성공"
    data: VideoListData


class VideoDetailData(BaseModel):
    name: str = Field(..., description="원본 파일명")
    processingTime: float | None = Field(None, description="삽입 처리 시간(초)")
    processingFps: float | None = Field(None, description="처리 FPS")
    embedPsnr: float = Field(..., description="삽입 PSNR (dB)")
    payloadBits: int = Field(..., description="페이로드 비트 수")
    businessId: str = Field(..., description="사업자 ID")
    contentUuid: str = Field(..., description="콘텐츠 UUID")
    thumbnailUrl: str | None = Field(None, description="썸네일 URL (없으면 null)")
    createdAt: datetime = Field(..., description="생성 타임스탬프")
    watermarkHex: str = Field(..., description="워터마크 페이로드 HEX")


class VideoDetailResponse(BaseModel):
    status: int = 200
    message: str = "워터마크 삽입 영상 상세 조회 성공"
    data: VideoDetailData
