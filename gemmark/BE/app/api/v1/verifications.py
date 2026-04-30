from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import verify_token
from app.schemas.verification import (
    VerificationDetailResponse,
    VerificationListResponse,
)
from app.services.verification_service import (
    get_verification_detail,
    list_verifications,
)

router = APIRouter(prefix="/verifications", tags=["verifications"])


@router.get(
    "",
    response_model=VerificationListResponse,
    summary="워터마크 검증 이력 목록 조회",
)
async def list_verifications_endpoint(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token),
) -> VerificationListResponse:
    admin_id = int(token_payload["sub"])
    data = await list_verifications(db, admin_id, page, size)
    return VerificationListResponse(data=data)


@router.get(
    "/{verification_id}",
    response_model=VerificationDetailResponse,
    summary="워터마크 검증 이력 상세 조회",
)
async def get_verification_detail_endpoint(
    verification_id: int,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token),
) -> VerificationDetailResponse:
    admin_id = int(token_payload["sub"])
    data = await get_verification_detail(db, admin_id, verification_id)
    return VerificationDetailResponse(data=data)
