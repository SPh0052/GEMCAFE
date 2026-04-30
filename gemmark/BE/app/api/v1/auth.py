from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import verify_token
from app.schemas.auth import LoginRequest, LoginResponse, LogoutResponse
from app.services.auth_service import login, logout

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="관리자 로그인",
)
async def login_endpoint(
    req: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    data = await login(db, req.loginId, req.password)
    return LoginResponse(data=data)


@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="관리자 로그아웃",
)
async def logout_endpoint(
    payload: dict = Depends(verify_token),
) -> LogoutResponse:
    await logout(payload)
    return LogoutResponse()
