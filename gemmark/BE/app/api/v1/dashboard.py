from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import verify_token
from app.schemas.dashboard import (
    AttackSuccessRateResponse,
    DashboardSummaryResponse,
    PsnrDistributionResponse,
)
from app.services.dashboard_service import (
    get_attack_success_rate,
    get_dashboard_summary,
    get_psnr_distribution,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    summary="대시보드 요약 정보 조회",
)
async def get_dashboard_summary_endpoint(
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token),
) -> DashboardSummaryResponse:
    data = await get_dashboard_summary(db)
    return DashboardSummaryResponse(data=data)


@router.get(
    "/psnr-distribution",
    response_model=PsnrDistributionResponse,
    summary="PSNR 분포별 영상 수 조회",
)
async def get_psnr_distribution_endpoint(
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token),
) -> PsnrDistributionResponse:
    data = await get_psnr_distribution(db)
    return PsnrDistributionResponse(data=data)


@router.get(
    "/attack-success-rate",
    response_model=AttackSuccessRateResponse,
    summary="강건성 공격 유형별 통과율 조회",
)
async def get_attack_success_rate_endpoint(
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token),
) -> AttackSuccessRateResponse:
    data = await get_attack_success_rate(db)
    return AttackSuccessRateResponse(data=data)
