from fastapi import HTTPException, status


class VideoUploadError(HTTPException):
    def __init__(self, status_code: int, error_code: str, message: str) -> None:
        super().__init__(
            status_code=status_code,
            detail={
                "status": status_code,
                "errorCode": error_code,
                "message": message,
            },
        )


class UnsupportedFileFormatError(VideoUploadError):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="VID-001",
            message="지원하지 않는 파일 형식입니다. MP4, MOV, AVI, MKV만 허용됩니다",
        )


class FileSizeExceededError(VideoUploadError):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="VID-002",
            message="파일 크기가 100MB를 초과합니다",
        )


class CorruptedFileError(VideoUploadError):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="VID-003",
            message="파일이 비어있거나 손상되었습니다",
        )


class FileNotAttachedError(VideoUploadError):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="VID-004",
            message="영상 파일이 첨부되지 않았습니다",
        )


class FileUploadError(VideoUploadError):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="VID-005",
            message="파일 업로드 중 오류가 발생했습니다",
        )


class VideoIdMissingError(VideoUploadError):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="WM-001",
            message="videoId가 누락되었습니다",
        )


class VideoNotFoundError(VideoUploadError):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="WM-002",
            message="해당 영상을 찾을 수 없습니다",
        )


class AlreadyWatermarkedError(VideoUploadError):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code="WM-003",
            message="이미 워터마크가 삽입된 영상입니다",
        )


class WatermarkEmbedError(VideoUploadError):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="WM-004",
            message="워터마크 삽입 중 오류가 발생했습니다",
        )


class VerifyVideoIdMissingError(VideoUploadError):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="VER-001",
            message="videoId가 누락되었습니다",
        )


class VerifyVideoNotFoundError(VideoUploadError):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="VER-002",
            message="해당 영상을 찾을 수 없습니다",
        )


class WatermarkVerifyError(VideoUploadError):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="VER-003",
            message="워터마크 검증 중 오류가 발생했습니다",
        )


class DownloadVideoNotFoundError(VideoUploadError):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="DL-001",
            message="해당 영상을 찾을 수 없습니다",
        )


class DownloadNotWatermarkedError(VideoUploadError):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code="DL-002",
            message="아직 워터마크가 삽입되지 않은 영상입니다",
        )


class DownloadError(VideoUploadError):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="DL-003",
            message="다운로드 중 오류가 발생했습니다",
        )


class InvalidCredentialsError(VideoUploadError):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTH-001",
            message="아이디 또는 비밀번호가 올바르지 않습니다",
        )


class MissingAuthParameterError(VideoUploadError):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="AUTH-002",
            message="필수 파라미터가 누락되었습니다",
        )


class InvalidTokenError(VideoUploadError):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTH-003",
            message="유효하지 않은 토큰입니다",
        )
