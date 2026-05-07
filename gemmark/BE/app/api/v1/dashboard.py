from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import verify_token
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.dashboard_service import get_dashboard_summary

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
