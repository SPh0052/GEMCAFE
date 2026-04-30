"""영상 단위 DCT 워터마크 삽입/추출.

watermark_dwt 참고 → 파일 경로 기반 + 청크 + ThreadPoolExecutor 병렬화.
"""

import concurrent.futures as cf
import os
import time
from pathlib import Path

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


def _adaptive_chunk_size(width: int, height: int, target_mb: int = 200) -> int:
    """해상도에 따라 청크 크기 자동 계산.

    한 청크가 메모리에서 차지하는 양을 ~target_mb 이하로 제한.
    """
    pixels_per_frame = width * height * 3  # uint8 BGR 기준 bytes
    if pixels_per_frame == 0:
        return 32
    target_bytes = target_mb * 1024 * 1024
    return max(4, min(128, int(target_bytes // pixels_per_frame)))


def _calc_workers() -> int:
    return min(os.cpu_count() or 4, 8)


def embed_video_file(
    src_path: Path,
    dest_path: Path,
    wm_bits: np.ndarray,
    key: int = DEFAULT_KEY,
    alpha: float = DEFAULT_ALPHA,
) -> dict:
    """파일 단위 DCT 워터마크 삽입 (청크 + 병렬).

    - 모든 프레임에 동일 워터마크 삽입 (강건성↑)
    - 청크 단위로 프레임 일괄 읽기 → 병렬 임베드 → 순차 쓰기

    Returns:
        dict 통계:
        - frames: 처리한 총 프레임 수
        - fps_input: 원본 FPS
        - resolution: "WxH"
        - duration_sec: 영상 길이 (초)
        - psnr: 첫 프레임 PSNR (dB)
        - processing_time: 처리 시간 (초)
        - processing_fps: 처리 속도 (frames/sec)
        - chunk_size: 사용한 청크 크기
        - workers: 사용한 워커 수
    """
    cap = cv2.VideoCapture(str(src_path))
    if not cap.isOpened():
        raise ValueError(f"영상 파일을 열 수 없습니다: {src_path}")

    fps_input = cap.get(cv2.CAP_PROP_FPS) or 25.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    chunk_size = _adaptive_chunk_size(width, height)
    workers = _calc_workers()

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    out = cv2.VideoWriter(str(dest_path), fourcc, fps_input, (width, height))

    psnr_first = 0.0
    frame_count = 0
    t0 = time.time()

    def _embed_one(frame: np.ndarray) -> np.ndarray:
        return dct_embed(frame, wm_bits, key=key, alpha=alpha)

    try:
        with cf.ThreadPoolExecutor(max_workers=workers) as pool:
            while True:
                # 1) 청크 단위로 프레임 일괄 읽기
                chunk: list[np.ndarray] = []
                for _ in range(chunk_size):
                    ret, frame = cap.read()
                    if not ret:
                        break
                    chunk.append(frame)

                if not chunk:
                    break

                # 2) 병렬 임베드 (pool.map은 입력 순서 보장)
                wm_chunk = list(pool.map(_embed_one, chunk))

                # 3) 첫 프레임 PSNR 측정 (대표값)
                if frame_count == 0:
                    psnr_first = calc_psnr(chunk[0], wm_chunk[0])

                # 4) 순차 쓰기 (영상 시간 순서 보존)
                for wf in wm_chunk:
                    out.write(wf)

                frame_count += len(chunk)
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
        "chunk_size": chunk_size,
        "workers": workers,
    }


def save_first_frame(
    src_path: Path,
    dest_path: Path,
    jpeg_quality: int = 85,
) -> bool:
    """영상의 첫 프레임을 JPG로 저장. 실패 시 False."""
    cap = cv2.VideoCapture(str(src_path))
    try:
        ret, frame = cap.read()
        if not ret:
            return False
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        return bool(
            cv2.imwrite(str(dest_path), frame, [cv2.IMWRITE_JPEG_QUALITY, jpeg_quality])
        )
    finally:
        cap.release()


def extract_video_file(
    src_path: Path,
    wm_len: int = PAYLOAD_BITS,
    key: int = DEFAULT_KEY,
    alpha: float = DEFAULT_ALPHA,
    n_sample: int = 8,
) -> tuple[np.ndarray, dict]:
    """영상에서 DCT 워터마크 비트열 추출.

    균등 간격으로 n_sample 프레임 샘플링 → 각 프레임에서 추출 → majority vote.
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
