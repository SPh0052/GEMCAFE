"""영상 단위 DCT 워터마크 삽입.

watermark_dwt 참고 → 입력/출력 모두 파일 경로 기반으로 단순화.
"""

import time
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from app.services.watermark.dct import (
    DEFAULT_ALPHA,
    DEFAULT_KEY,
    embed as dct_embed,
    extract as dct_extract,
)
from app.services.watermark.metrics import psnr as calc_psnr
from app.services.watermark.payload import PAYLOAD_BITS


def embed_video_file(
    src_path: Path,
    dest_path: Path,
    wm_bits: np.ndarray,
    key: int = DEFAULT_KEY,
    alpha: float = DEFAULT_ALPHA,
    max_seconds: Optional[float] = None,
) -> dict:
    """파일 단위로 DCT 워터마크 삽입.

    Returns:
        dict with keys:
        - frames (int)
        - fps_input (float): 원본 영상 FPS
        - resolution (str)
        - duration_sec (float)
        - psnr (float): 첫 프레임 PSNR (대표값)
        - processing_time (float): 처리 시간 (초)
        - processing_fps (float): 처리 속도 (frames/sec)
    """
    cap = cv2.VideoCapture(str(src_path))
    if not cap.isOpened():
        raise ValueError(f"영상 파일을 열 수 없습니다: {src_path}")

    fps_input = cap.get(cv2.CAP_PROP_FPS) or 25.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if max_seconds is None or max_seconds <= 0:
        max_frames = total_frames if total_frames > 0 else 10**9
    else:
        max_frames = max(1, int(fps_input * max_seconds))

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    out = cv2.VideoWriter(str(dest_path), fourcc, fps_input, (width, height))

    psnr_first = 0.0
    frame_count = 0
    t0 = time.time()

    try:
        while frame_count < max_frames:
            ret, frame = cap.read()
            if not ret:
                break

            wm_frame = dct_embed(frame, wm_bits, key=key, alpha=alpha)

            if frame_count == 0:
                psnr_first = calc_psnr(frame, wm_frame)

            out.write(wm_frame)
            frame_count += 1
    finally:
        cap.release()
        out.release()

    elapsed = time.time() - t0
    processing_fps = frame_count / elapsed if elapsed > 0 else 0.0

    return {
        "frames": frame_count,
        "fps_input": round(fps_input, 2),
        "resolution": f"{width}x{height}",
        "duration_sec": round(frame_count / fps_input, 2) if fps_input > 0 else 0.0,
        "psnr": round(psnr_first, 2),
        "processing_time": round(elapsed, 2),
        "processing_fps": round(processing_fps, 2),
    }


def extract_video_file(
    src_path: Path,
    wm_len: int = PAYLOAD_BITS,
    key: int = DEFAULT_KEY,
    alpha: float = DEFAULT_ALPHA,
    n_sample: int = 8,
) -> tuple[np.ndarray, dict]:
    """영상에서 DCT 워터마크 비트열 추출.

    균등 간격으로 n_sample 프레임 샘플링 → 각 프레임에서 추출 → majority vote.

    Returns:
        (extracted_bits, stats):
            extracted_bits: (wm_len,) uint8
            stats:
                - frames_sampled (int)
                - frames_extracted (int)
                - processing_time (float): 초
    """
    cap = cv2.VideoCapture(str(src_path))
    if not cap.isOpened():
        raise ValueError(f"영상 파일을 열 수 없습니다: {src_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        cap.release()
        return np.zeros(wm_len, dtype=np.uint8), {
            "frames_sampled": 0,
            "frames_extracted": 0,
            "processing_time": 0.0,
        }

    indices = np.linspace(0, total_frames - 1, min(n_sample, total_frames), dtype=int)

    votes = np.zeros(wm_len, dtype=np.int32)
    n_extracted = 0
    t0 = time.time()

    try:
        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
            ret, frame = cap.read()
            if not ret:
                continue
            try:
                bits = dct_extract(frame, wm_len, key=key, alpha=alpha)
            except ValueError:
                continue
            votes += bits.astype(np.int32)
            n_extracted += 1
    finally:
        cap.release()

    elapsed = time.time() - t0

    if n_extracted == 0:
        return np.zeros(wm_len, dtype=np.uint8), {
            "frames_sampled": int(len(indices)),
            "frames_extracted": 0,
            "processing_time": round(elapsed, 2),
        }

    extracted = (votes > n_extracted / 2).astype(np.uint8)
    return extracted, {
        "frames_sampled": int(len(indices)),
        "frames_extracted": n_extracted,
        "processing_time": round(elapsed, 2),
    }
