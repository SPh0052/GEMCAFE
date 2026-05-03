import enum
from datetime import datetime

from app.schemas.video import VideoListData
from pydantic import BaseModel, Field


class RobustnessTargetListResponse(BaseModel):
    status: int = 200
    message: str = "강건성 테스트 대상 영상 목록 조회 성공"
    data: VideoListData


class RobustnessRunRequest(BaseModel):
    startDate: str | None = Field(
        default=None, description="테스트 영상 필터 시작일 (YYYY-MM-DD)"
    )
    endDate: str | None = Field(
        default=None, description="테스트 영상 필터 종료일 (YYYY-MM-DD)"
    )


class FailedVideoItem(BaseModel):
    id: int = Field(..., description="실패 영상의 video_watermarked.id")
    fileName: str = Field(..., description="원본 파일명")
    alpha: int = Field(..., description="워터마크 alpha (강도 계수)")
    passed: bool = Field(..., description="강건성 통과 여부 (실패 영상은 false)")


class RobustnessRunData(BaseModel):
    totalCount: int
    successCount: int
    failCount: int
    averageBer: float
    averagePsnr: float
    averageProcessingTime: float
    failedVideos: list[FailedVideoItem]


class RobustnessRunResponse(BaseModel):
    status: int = 200
    message: str = "강건성 테스트 실행 성공"
    data: RobustnessRunData


class TestPassedStatus(str, enum.Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class RobustnessVideoInfoData(BaseModel):
    videoFileName: str
    videoUuid: str
    createDate: datetime
    fileSize: int
    testDate: datetime
    testPassed: TestPassedStatus
    adminId: str


class RobustnessVideoInfoResponse(BaseModel):
    status: int = 200
    message: str = "테스트 상세 - 영상 정보 조회 성공"
    data: RobustnessVideoInfoData
