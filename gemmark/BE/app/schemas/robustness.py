from app.schemas.video import VideoListData
from pydantic import BaseModel


class RobustnessTargetListResponse(BaseModel):
    status: int = 200
    message: str = "강건성 테스트 대상 영상 목록 조회 성공"
    data: VideoListData
