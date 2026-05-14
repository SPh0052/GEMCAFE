from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import verify_token
from app.schemas.robustness import (
    RobustnessAttackResultResponse,
    RobustnessHistoryResponse,
    RobustnessRunRequest,
    RobustnessRunResponse,
    RobustnessStatusResponse,
    RobustnessTargetListResponse,
    RobustnessTestDetailResponse,
    RobustnessVideoInfoResponse,
)
from app.services.robustness_service import (
    get_robustness_attack_results,
    get_robustness_test_detail,
    get_robustness_test_status,
    get_robustness_test_video_info,
    list_robustness_history,
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


@router.get(
    "/tests/{test_id}/status",
    response_model=RobustnessStatusResponse,
    summary="강건성 테스트 진행 상태 조회 (폴링용)",
)
async def get_robustness_test_status_endpoint(
    test_id: int,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token),
) -> RobustnessStatusResponse:
    data = await get_robustness_test_status(db, test_id)
    return RobustnessStatusResponse(data=data)


@router.get(
    "/tests/{test_id}",
    response_model=RobustnessTestDetailResponse,
    summary="강건성 테스트 상세 조회",
)
async def get_robustness_test_detail_endpoint(
    test_id: int,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token),
) -> RobustnessTestDetailResponse:
    data = await get_robustness_test_detail(db, test_id)
    return RobustnessTestDetailResponse(data=data)


@router.get(
    "/tests/{test_id}/videos/{video_id}",
    response_model=RobustnessVideoInfoResponse,
    summary="강건성 테스트 상세 - 영상 기본 정보 조회",
)
async def get_robustness_test_video_info_endpoint(
    test_id: int,
    video_id: int,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token),
) -> RobustnessVideoInfoResponse:
    data = await get_robustness_test_video_info(db, test_id, video_id)
    return RobustnessVideoInfoResponse(data=data)


@router.get(
    "/tests/{test_id}/videos/{video_id}/attacks",
    response_model=RobustnessAttackResultResponse,
    summary="강건성 테스트 상세 - 공격 유형별 결과 조회",
)
async def get_robustness_attack_results_endpoint(
    test_id: int,
    video_id: int,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token),
) -> RobustnessAttackResultResponse:
    data = await get_robustness_attack_results(db, test_id, video_id)
    return RobustnessAttackResultResponse(data=data)


@router.get(
    "/history",
    response_model=RobustnessHistoryResponse,
    summary="강건성 테스트 이력 조회",
)
async def list_robustness_history_endpoint(
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token),
) -> RobustnessHistoryResponse:
    admin_id = int(token_payload["sub"])
    data = await list_robustness_history(db, admin_id)
    return RobustnessHistoryResponse(data=data)


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
