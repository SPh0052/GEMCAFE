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
