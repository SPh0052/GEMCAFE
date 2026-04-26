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
