from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import verify_token
from app.schemas.robustness import (
    RobustnessRunRequest,
    RobustnessRunResponse,
    RobustnessTargetListResponse,
)
from app.services.robustness_service import (
    list_robustness_target_videos,
    run_robustness_test,
)

router = APIRouter(prefix="/robustness", tags=["robustness"])


@router.get(
    "",
    response_model=RobustnessTargetListResponse,
    summary="강건성 테스트 대상 영상 목록 조회",
)
async def list_robustness_target_videos_endpoint(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    startDate: date | None = Query(
        default=None,
        description="워터마크 삽입일 시작 (YYYY-MM-DD, inclusive)",
    ),
    endDate: date | None = Query(
        default=None,
        description="워터마크 삽입일 종료 (YYYY-MM-DD, inclusive)",
    ),
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token),
) -> RobustnessTargetListResponse:
    admin_id = int(token_payload["sub"])
    data = await list_robustness_target_videos(
        db, admin_id, page, size, startDate, endDate
    )
    return RobustnessTargetListResponse(data=data)


@router.post(
    "/run",
    response_model=RobustnessRunResponse,
    summary="강건성 테스트 실행",
)
async def run_robustness_test_endpoint(
    body: RobustnessRunRequest,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token),
) -> RobustnessRunResponse:
    admin_id = int(token_payload["sub"])
    data = await run_robustness_test(db, admin_id, body.startDate, body.endDate)
    return RobustnessRunResponse(data=data)
