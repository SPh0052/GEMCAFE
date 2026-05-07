"""강건성 테스트용 7가지 공격.

프레임 단위 공격 6종 + 영상 단위 공격 1종(H.264 재인코딩).
공격 ID는 robustness_attack_type 테이블의 PK로 사용된다.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from typing import Callable

import cv2
import numpy as np


# ──────────────────────────────────────────
# 공격 ID 상수 (DB robustness_attack_type.id)
# ──────────────────────────────────────────
ATTACK_H264_REENCODE = "H264_REENCODE"
ATTACK_JPEG_Q50 = "JPEG_Q50"
ATTACK_CROP = "CROP"
ATTACK_RESCALE = "RESCALE"
ATTACK_BRIGHTNESS_CONTRAST = "BRIGHTNESS_CONTRAST"
ATTACK_GAUSSIAN_NOISE = "GAUSSIAN_NOISE"
ATTACK_HORIZONTAL_FLIP = "HORIZONTAL_FLIP"


ATTACK_TYPES: dict[str, str] = {
    ATTACK_H264_REENCODE: "H.264(AVC) 재인코딩",
    ATTACK_JPEG_Q50: "JPEG 압축(Q50)",
    ATTACK_CROP: "크롭",
    ATTACK_RESCALE: "해상도 축소",
    ATTACK_BRIGHTNESS_CONTRAST: "밝기/대비 조정",
    ATTACK_GAUSSIAN_NOISE: "가우시안 노이즈(σ25)",
    ATTACK_HORIZONTAL_FLIP: "좌우반전",
}


# ──────────────────────────────────────────
# 프레임 단위 공격
# ──────────────────────────────────────────
def jpeg_compression(frame: np.ndarray, quality: int = 50) -> np.ndarray:
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    _, buf = cv2.imencode(".jpg", frame, encode_param)
    return cv2.imdecode(buf, cv2.IMREAD_COLOR)


def crop_resize(frame: np.ndarray, crop_ratio: float = 0.1) -> np.ndarray:
    h, w = frame.shape[:2]
    top = int(h * crop_ratio)
    left = int(w * crop_ratio)
    cropped = frame[top : h - top, left : w - left]
    return cv2.resize(cropped, (w, h), interpolation=cv2.INTER_LINEAR)


def rescale(frame: np.ndarray, scale: float = 0.667) -> np.ndarray:
    h, w = frame.shape[:2]
    small_w, small_h = max(1, int(w * scale)), max(1, int(h * scale))
    downscaled = cv2.resize(frame, (small_w, small_h), interpolation=cv2.INTER_AREA)
    return cv2.resize(downscaled, (w, h), interpolation=cv2.INTER_LINEAR)


def brightness_contrast(
    frame: np.ndarray, brightness: int = 50, contrast: float = 1.3
) -> np.ndarray:
    adjusted = frame.astype(np.float64) * contrast + brightness
    return np.clip(adjusted, 0, 255).astype(np.uint8)


def gaussian_noise(frame: np.ndarray, sigma: float = 25.0) -> np.ndarray:
    rng = np.random.RandomState(0)
    noise = rng.normal(0, sigma, frame.shape)
    return np.clip(frame.astype(np.float64) + noise, 0, 255).astype(np.uint8)


def horizontal_flip(frame: np.ndarray) -> np.ndarray:
    return cv2.flip(frame, 1)


FRAME_ATTACKS: dict[str, Callable[[np.ndarray], np.ndarray]] = {
    ATTACK_JPEG_Q50: lambda f: jpeg_compression(f, quality=50),
    ATTACK_CROP: lambda f: crop_resize(f, crop_ratio=0.1),
    ATTACK_RESCALE: lambda f: rescale(f, scale=0.667),
    ATTACK_BRIGHTNESS_CONTRAST: lambda f: brightness_contrast(f, brightness=50, contrast=1.3),
    ATTACK_GAUSSIAN_NOISE: lambda f: gaussian_noise(f, sigma=25.0),
    ATTACK_HORIZONTAL_FLIP: horizontal_flip,
}


# ──────────────────────────────────────────
# 영상 단위 공격: H.264(AVC) 재인코딩
# ──────────────────────────────────────────
def h264_reencode(src_path: Path, dest_path: Path, crf: int = 28) -> None:
    """ffmpeg로 H.264 재인코딩. ffmpeg 미설치/실패 시 RuntimeError."""
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg가 설치되어 있지 않습니다.")

    dest_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-loglevel", "error",
        "-i", str(src_path),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", str(crf),
        "-an",
        str(dest_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not dest_path.exists():
        raise RuntimeError(f"ffmpeg 재인코딩 실패: {result.stderr.strip()}")
