from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    loginId: str | None = Field(default=None, description="사용자 아이디")
    password: str | None = Field(default=None, description="사용자 비밀번호")


class LoginData(BaseModel):
    accessToken: str = Field(..., description="JWT 액세스 토큰")
    refreshToken: str = Field(..., description="JWT 리프레시 토큰")
    tokenType: str = Field(default="Bearer", description="토큰 타입")
    expiresIn: int = Field(..., description="만료 시간(초)")


class LoginResponse(BaseModel):
    status: int = 200
    message: str = "로그인 성공"
    data: LoginData
