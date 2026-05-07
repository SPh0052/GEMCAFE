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


class LogoutResponse(BaseModel):
    status: int = 200
    message: str = "로그아웃 성공"
    data: None = None


class RefreshRequest(BaseModel):
    refreshToken: str | None = Field(default=None, description="이전에 발급된 refresh 토큰")


class RefreshData(BaseModel):
    accessToken: str = Field(..., description="새로 발급된 access 토큰")
    tokenType: str = Field(default="Bearer", description="토큰 타입")
    expiresIn: int = Field(..., description="access 만료 시간(초)")


class RefreshResponse(BaseModel):
    status: int = 200
    message: str = "토큰 재발급 성공"
    data: RefreshData
